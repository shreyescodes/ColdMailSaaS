import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { contactsAPI } from '../../services/api';

export interface Contact {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  organizationId: string;
  company?: string;
  jobTitle?: string;
  phone?: string;
  website?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  timezone?: string;
  language?: string;
  status: string;
  source: string;
  engagement: any;
  campaignHistory: any;
  tags: string[];
  segments: string[];
  customFields: any;
  preferences: any;
  bounceInfo?: any;
  complaintInfo?: any;
  unsubscribeInfo?: any;
  metadata: any;
  emailVerified: boolean;
  emailVerifiedAt?: string;
  emailVerificationToken?: string;
  lastActivityAt?: string;
  lastEngagementAt?: string;
  lastCampaignAt?: string;
  isActive: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface ContactsState {
  contacts: Contact[];
  currentContact: Contact | null;
  loading: boolean;
  error: string | null;
  filters: {
    status: string[];
    source: string[];
    tags: string[];
    segments: string[];
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  selectedContacts: string[];
}

const initialState: ContactsState = {
  contacts: [],
  currentContact: null,
  loading: false,
  error: null,
  filters: {
    status: [],
    source: [],
    tags: [],
    segments: [],
  },
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
  },
  selectedContacts: [],
};

// Async thunks
export const fetchContacts = createAsyncThunk(
  'contacts/fetchContacts',
  async (params?: any) => {
    const response = await contactsAPI.getAll(params);
    return response.data;
  }
);

export const fetchContactById = createAsyncThunk(
  'contacts/fetchContactById',
  async (id: string) => {
    const response = await contactsAPI.getById(id);
    return response.data;
  }
);

export const createContact = createAsyncThunk(
  'contacts/createContact',
  async (contactData: Partial<Contact>) => {
    const response = await contactsAPI.create(contactData);
    return response.data;
  }
);

export const updateContact = createAsyncThunk(
  'contacts/updateContact',
  async ({ id, data }: { id: string; data: Partial<Contact> }) => {
    const response = await contactsAPI.update(id, data);
    return response.data;
  }
);

export const deleteContact = createAsyncThunk(
  'contacts/deleteContact',
  async (id: string) => {
    await contactsAPI.delete(id);
    return id;
  }
);

export const importContacts = createAsyncThunk(
  'contacts/importContacts',
  async (data: any) => {
    const response = await contactsAPI.import(data);
    return response.data;
  }
);

export const exportContacts = createAsyncThunk(
  'contacts/exportContacts',
  async (params?: any) => {
    const response = await contactsAPI.export(params);
    return response.data;
  }
);

const contactsSlice = createSlice({
  name: 'contacts',
  initialState,
  reducers: {
    setCurrentContact: (state, action: PayloadAction<Contact | null>) => {
      state.currentContact = action.payload;
    },
    setFilters: (state, action: PayloadAction<Partial<ContactsState['filters']>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    setPagination: (state, action: PayloadAction<Partial<ContactsState['pagination']>>) => {
      state.pagination = { ...state.pagination, ...action.payload };
    },
    setSelectedContacts: (state, action: PayloadAction<string[]>) => {
      state.selectedContacts = action.payload;
    },
    toggleContactSelection: (state, action: PayloadAction<string>) => {
      const contactId = action.payload;
      const index = state.selectedContacts.indexOf(contactId);
      if (index > -1) {
        state.selectedContacts.splice(index, 1);
      } else {
        state.selectedContacts.push(contactId);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch contacts
      .addCase(fetchContacts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContacts.fulfilled, (state, action) => {
        state.loading = false;
        state.contacts = action.payload.contacts || action.payload;
        state.pagination.total = action.payload.total || action.payload.length;
      })
      .addCase(fetchContacts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contacts';
      })
      // Fetch contact by ID
      .addCase(fetchContactById.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchContactById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentContact = action.payload;
      })
      .addCase(fetchContactById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch contact';
      })
      // Create contact
      .addCase(createContact.fulfilled, (state, action) => {
        state.contacts.unshift(action.payload);
        state.currentContact = action.payload;
      })
      // Update contact
      .addCase(updateContact.fulfilled, (state, action) => {
        const index = state.contacts.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.contacts[index] = action.payload;
        }
        if (state.currentContact?.id === action.payload.id) {
          state.currentContact = action.payload;
        }
      })
      // Delete contact
      .addCase(deleteContact.fulfilled, (state, action) => {
        state.contacts = state.contacts.filter(c => c.id !== action.payload);
        if (state.currentContact?.id === action.payload) {
          state.currentContact = null;
        }
        // Remove from selected contacts
        state.selectedContacts = state.selectedContacts.filter(id => id !== action.payload);
      })
      // Import contacts
      .addCase(importContacts.fulfilled, (state, action) => {
        // Add imported contacts to the list
        if (Array.isArray(action.payload)) {
          state.contacts.unshift(...action.payload);
        }
      })
      // Export contacts
      .addCase(exportContacts.fulfilled, (state, action) => {
        // Handle export success (e.g., show download link)
        console.log('Contacts exported successfully');
      });
  },
});

export const {
  setCurrentContact,
  setFilters,
  setPagination,
  setSelectedContacts,
  toggleContactSelection,
  clearError,
} = contactsSlice.actions;

export default contactsSlice.reducer;
