import { Injectable, Logger } from '@nestjs/common';

export interface VariableContext {
  contact: {
    firstName: string;
    lastName: string;
    fullName: string;
    company: string;
    jobTitle: string;
    industry: string;
    city: string;
    state: string;
    country: string;
    timezone: string;
    language: string;
  };
  campaign: {
    name: string;
    type: string;
    createdBy: string;
    organization: string;
  };
  organization: {
    name: string;
    website: string;
    industry: string;
  };
  custom: Record<string, any>;
}

export interface VariableDefinition {
  name: string;
  description: string;
  example: string;
  category: 'contact' | 'campaign' | 'organization' | 'custom' | 'system';
  required: boolean;
}

@Injectable()
export class DynamicVariablesService {
  private readonly logger = new Logger(DynamicVariablesService.name);

  private readonly systemVariables: VariableDefinition[] = [
    { name: '{{current_date}}', description: 'Current date in YYYY-MM-DD format', example: '2024-01-15', category: 'system', required: false },
    { name: '{{current_time}}', description: 'Current time in HH:MM format', example: '14:30', category: 'system', required: false },
    { name: '{{unsubscribe_link}}', description: 'Unsubscribe link for the contact', example: 'https://example.com/unsubscribe?token=abc123', category: 'system', required: false },
    { name: '{{tracking_pixel}}', description: 'Tracking pixel for email opens', example: '<img src="https://example.com/track/open/abc123" />', category: 'system', required: false },
  ];

  private readonly contactVariables: VariableDefinition[] = [
    { name: '{{first_name}}', description: 'Contact first name', example: 'John', category: 'contact', required: false },
    { name: '{{last_name}}', description: 'Contact last name', example: 'Doe', category: 'contact', required: false },
    { name: '{{full_name}}', description: 'Contact full name', example: 'John Doe', category: 'contact', required: false },
    { name: '{{company}}', description: 'Contact company name', example: 'Acme Corp', category: 'contact', required: false },
    { name: '{{job_title}}', description: 'Contact job title', example: 'Marketing Manager', category: 'contact', required: false },
    { name: '{{industry}}', description: 'Contact industry', example: 'Technology', category: 'contact', required: false },
    { name: '{{city}}', description: 'Contact city', example: 'San Francisco', category: 'contact', required: false },
    { name: '{{state}}', description: 'Contact state/province', example: 'CA', category: 'contact', required: false },
    { name: '{{country}}', description: 'Contact country', example: 'USA', category: 'contact', required: false },
    { name: '{{timezone}}', description: 'Contact timezone', example: 'PST', category: 'contact', required: false },
    { name: '{{language}}', description: 'Contact language preference', example: 'en', category: 'contact', required: false },
  ];

  private readonly campaignVariables: VariableDefinition[] = [
    { name: '{{campaign_name}}', description: 'Campaign name', example: 'Q1 Outreach', category: 'campaign', required: false },
    { name: '{{campaign_type}}', description: 'Campaign type', example: 'sequence', category: 'campaign', required: false },
    { name: '{{created_by}}', description: 'Campaign creator name', example: 'Jane Smith', category: 'campaign', required: false },
    { name: '{{organization_name}}', description: 'Organization name', example: 'SalesPro Inc', category: 'campaign', required: false },
  ];

  private readonly organizationVariables: VariableDefinition[] = [
    { name: '{{org_name}}', description: 'Organization name', example: 'SalesPro Inc', category: 'organization', required: false },
    { name: '{{org_website}}', description: 'Organization website', example: 'https://salespro.com', category: 'organization', required: false },
    { name: '{{org_industry}}', description: 'Organization industry', example: 'SaaS', category: 'organization', required: false },
  ];

  getAllVariableDefinitions(): VariableDefinition[] {
    return [
      ...this.systemVariables,
      ...this.contactVariables,
      ...this.campaignVariables,
      ...this.organizationVariables,
    ];
  }

  getVariablesByCategory(category: string): VariableDefinition[] {
    return this.getAllVariableDefinitions().filter(v => v.category === category);
  }

  extractVariablesFromTemplate(template: string): string[] {
    const variableRegex = /\{\{([^}]+)\}\}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(template)) !== null) {
      variables.push(match[1]);
    }

    return [...new Set(variables)]; // Remove duplicates
  }

  validateTemplateVariables(template: string, availableVariables: string[]): {
    valid: boolean;
    missing: string[];
    unused: string[];
  } {
    const templateVariables = this.extractVariablesFromTemplate(template);
    const missing = templateVariables.filter(v => !availableVariables.includes(v));
    const unused = availableVariables.filter(v => !templateVariables.includes(v));

    return {
      valid: missing.length === 0,
      missing,
      unused,
    };
  }

  replaceVariables(template: string, context: VariableContext): string {
    let result = template;

    // Replace system variables
    result = result.replace(/\{\{current_date\}\}/g, new Date().toISOString().split('T')[0]);
    result = result.replace(/\{\{current_time\}\}/g, new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }));
    result = result.replace(/\{\{unsubscribe_link\}\}/g, `https://example.com/unsubscribe?token=${this.generateToken()}`);
    result = result.replace(/\{\{tracking_pixel\}\}/g, `<img src="https://example.com/track/open/${this.generateToken()}" width="1" height="1" style="display:none;" />`);

    // Replace contact variables
    result = result.replace(/\{\{first_name\}\}/g, context.contact.firstName || '');
    result = result.replace(/\{\{last_name\}\}/g, context.contact.lastName || '');
    result = result.replace(/\{\{full_name\}\}/g, context.contact.fullName || '');
    result = result.replace(/\{\{company\}\}/g, context.contact.company || '');
    result = result.replace(/\{\{job_title\}\}/g, context.contact.jobTitle || '');
    result = result.replace(/\{\{industry\}\}/g, context.contact.industry || '');
    result = result.replace(/\{\{city\}\}/g, context.contact.city || '');
    result = result.replace(/\{\{state\}\}/g, context.contact.state || '');
    result = result.replace(/\{\{country\}\}/g, context.contact.country || '');
    result = result.replace(/\{\{timezone\}\}/g, context.contact.timezone || '');
    result = result.replace(/\{\{language\}\}/g, context.contact.language || '');

    // Replace campaign variables
    result = result.replace(/\{\{campaign_name\}\}/g, context.campaign.name || '');
    result = result.replace(/\{\{campaign_type\}\}/g, context.campaign.type || '');
    result = result.replace(/\{\{created_by\}\}/g, context.campaign.createdBy || '');
    result = result.replace(/\{\{organization_name\}\}/g, context.campaign.organization || '');

    // Replace organization variables
    result = result.replace(/\{\{org_name\}\}/g, context.organization.name || '');
    result = result.replace(/\{\{org_website\}\}/g, context.organization.website || '');
    result = result.replace(/\{\{org_industry\}\}/g, context.organization.industry || '');

    // Replace custom variables
    for (const [key, value] of Object.entries(context.custom)) {
      const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
      result = result.replace(regex, String(value));
    }

    return result;
  }

  generatePersonalizationSuggestions(template: string, contact: any): string[] {
    const suggestions: string[] = [];
    const templateLower = template.toLowerCase();

    // Check for generic greetings
    if (templateLower.includes('hello') || templateLower.includes('hi there') || templateLower.includes('dear sir/madam')) {
      suggestions.push('Consider using {{first_name}} for a more personal greeting');
    }

    // Check for generic company references
    if (templateLower.includes('your company') || templateLower.includes('your organization')) {
      suggestions.push('Use {{company}} to reference the contact\'s specific company');
    }

    // Check for generic industry references
    if (templateLower.includes('your industry') || templateLower.includes('this industry')) {
      suggestions.push('Use {{industry}} to reference the contact\'s specific industry');
    }

    // Check for generic job title references
    if (templateLower.includes('your role') || templateLower.includes('your position')) {
      suggestions.push('Use {{job_title}} to reference the contact\'s specific role');
    }

    // Check for location-based personalization opportunities
    if (contact.city || contact.state || contact.country) {
      suggestions.push('Consider adding location-specific content using {{city}}, {{state}}, or {{country}}');
    }

    // Check for timezone-based personalization
    if (contact.timezone) {
      suggestions.push('Use {{timezone}} to reference the contact\'s timezone for meeting scheduling');
    }

    return suggestions;
  }

  createVariableContext(contact: any, campaign: any, organization: any, customVariables: Record<string, any> = {}): VariableContext {
    return {
      contact: {
        firstName: contact.firstName || '',
        lastName: contact.lastName || '',
        fullName: `${contact.firstName || ''} ${contact.lastName || ''}`.trim(),
        company: contact.company || '',
        jobTitle: contact.jobTitle || '',
        industry: contact.industry || '',
        city: contact.city || '',
        state: contact.state || '',
        country: contact.country || '',
        timezone: contact.timezone || '',
        language: contact.language || 'en',
      },
      campaign: {
        name: campaign.name || '',
        type: campaign.type || '',
        createdBy: campaign.createdByUser?.firstName ? `${campaign.createdByUser.firstName} ${campaign.createdByUser.lastName}` : '',
        organization: campaign.organization?.name || '',
      },
      organization: {
        name: organization.name || '',
        website: organization.website || '',
        industry: organization.industry || '',
      },
      custom: customVariables,
    };
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
}
