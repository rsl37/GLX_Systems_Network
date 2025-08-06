#!/usr/bin/env node

/*
 * Copyright © 2025 GLX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GLX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */

/**
 * GLX Civic Data MCP Server
 * Civic services and government data integration for the GLX platform
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const https = require('https');
// const { URL } = require('url'); // Commented out as not currently used

class CivicMCPServer {
  constructor() {
    this.server = new Server({
      name: 'GLX Civic Data MCP Server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.civicApiKey = process.env.CIVIC_API_KEY;
    this.openDataApiKey = process.env.OPEN_DATA_API_KEY;
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'get_civic_data',
            description: 'Get general civic data for a location',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location (city, state, or coordinates)' },
                dataType: {
                  type: 'string',
                  enum: ['demographics', 'economy', 'infrastructure', 'governance'],
                  description: 'Type of civic data to retrieve',
                },
              },
              required: ['location', 'dataType'],
            },
          },
          {
            name: 'search_local_services',
            description: 'Find local government services and resources',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location to search around' },
                serviceType: {
                  type: 'string',
                  enum: ['health', 'education', 'transportation', 'utilities', 'safety'],
                  description: 'Type of service to find',
                },
                radius: { type: 'number', description: 'Search radius in miles', default: 10 },
              },
              required: ['location', 'serviceType'],
            },
          },
          {
            name: 'get_community_events',
            description: 'Get upcoming community and civic events',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location to search for events' },
                eventType: {
                  type: 'string',
                  enum: [
                    'town_hall',
                    'community_meeting',
                    'public_hearing',
                    'volunteer',
                    'festival',
                  ],
                  description: 'Type of event',
                },
                dateRange: {
                  type: 'string',
                  description: 'Date range (e.g., "next_week", "next_month")',
                },
              },
              required: ['location'],
            },
          },
          {
            name: 'report_civic_issue',
            description: 'Report community issues like potholes, broken streetlights',
            inputSchema: {
              type: 'object',
              properties: {
                issueType: {
                  type: 'string',
                  enum: [
                    'pothole',
                    'streetlight',
                    'traffic_signal',
                    'graffiti',
                    'trash',
                    'water_leak',
                    'other',
                  ],
                  description: 'Type of civic issue',
                },
                location: {
                  type: 'string',
                  description: 'Location of the issue (coordinates or address)',
                },
                description: { type: 'string', description: 'Detailed description of the issue' },
                priority: {
                  type: 'string',
                  enum: ['low', 'medium', 'high', 'emergency'],
                  description: 'Issue priority level',
                },
                contactInfo: {
                  type: 'string',
                  description: 'Optional contact information for follow-up',
                },
              },
              required: ['issueType', 'location', 'description', 'priority'],
            },
          },
          {
            name: 'get_government_contacts',
            description: 'Get contact information for local government officials',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location to find representatives for' },
                level: {
                  type: 'string',
                  enum: ['local', 'county', 'state', 'federal'],
                  description: 'Government level',
                },
                office: { type: 'string', description: 'Specific office or department' },
              },
              required: ['location', 'level'],
            },
          },
          {
            name: 'search_nonprofits',
            description: 'Search for local nonprofit organizations',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location to search around' },
                cause: {
                  type: 'string',
                  enum: [
                    'education',
                    'health',
                    'environment',
                    'poverty',
                    'arts',
                    'animals',
                    'community',
                  ],
                  description: 'Nonprofit cause area',
                },
                radius: { type: 'number', description: 'Search radius in miles', default: 25 },
              },
              required: ['location'],
            },
          },
        ],
      };
    });

    this.server.setRequestHandler('tools/call', async request => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'get_civic_data':
          return this.getCivicData(args);
        case 'search_local_services':
          return this.searchLocalServices(args);
        case 'get_community_events':
          return this.getCommunityEvents(args);
        case 'report_civic_issue':
          return this.reportCivicIssue(args);
        case 'get_government_contacts':
          return this.getGovernmentContacts(args);
        case 'search_nonprofits':
          return this.searchNonprofits(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async makeApiRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
      const request = https.request(url, options, response => {
        let data = '';
        response.on('data', chunk => {
          data += chunk;
        });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch {
            resolve(data);
          }
        });
      });

      request.on('error', reject);
      request.end();
    });
  }

  async getCivicData({ location, dataType }) {
    // Mock implementation - in production, this would call real civic data APIs
    const mockData = {
      demographics: {
        population: '45,678',
        median_age: '34.2',
        median_income: '$52,340',
        education_level: "Bachelor's degree: 38%",
      },
      economy: {
        unemployment_rate: '3.4%',
        major_employers: ['City Government', 'Regional Hospital', 'Local University'],
        business_permits_issued: '234 this year',
      },
      infrastructure: {
        road_condition: 'Good (87% rated good or excellent)',
        public_transit: 'Bus system with 12 routes',
        utilities: 'Water, electric, gas, fiber internet available',
      },
      governance: {
        mayor: 'Jane Smith',
        city_council_members: 7,
        next_election: 'November 2025',
        budget: '$45.2M annual budget',
      },
    };

    return {
      content: [
        {
          type: 'text',
          text: `Civic data for ${location} (${dataType}):\n${JSON.stringify(mockData[dataType], null, 2)}`,
        },
      ],
    };
  }

  async searchLocalServices({ location, serviceType, radius = 10 }) {
    // Mock implementation
    const mockServices = {
      health: [
        {
          name: 'City Health Department',
          address: '123 Main St',
          phone: '(555) 123-4567',
          services: ['Immunizations', 'Health screenings'],
        },
        {
          name: 'Community Health Center',
          address: '456 Oak Ave',
          phone: '(555) 234-5678',
          services: ['Primary care', 'Mental health'],
        },
      ],
      education: [
        {
          name: 'Public Library Main Branch',
          address: '789 Elm St',
          phone: '(555) 345-6789',
          services: ['Books', 'Computer access', 'Programs'],
        },
        {
          name: 'Adult Learning Center',
          address: '321 Pine St',
          phone: '(555) 456-7890',
          services: ['GED prep', 'English classes'],
        },
      ],
      transportation: [
        {
          name: 'City Bus Terminal',
          address: '654 Transit Way',
          phone: '(555) 567-8901',
          services: ['Regional bus service', 'Route maps'],
        },
        {
          name: 'Bike Share Station',
          address: 'Multiple locations',
          services: ['Bicycle rentals', 'Monthly passes'],
        },
      ],
      utilities: [
        {
          name: 'Water Department',
          address: '987 Utility Dr',
          phone: '(555) 678-9012',
          services: ['Water service', 'Bill payment', 'Leak reporting'],
        },
        {
          name: 'Electric Company',
          address: '147 Power St',
          phone: '(555) 789-0123',
          services: ['Electric service', 'Outage reporting'],
        },
      ],
      safety: [
        {
          name: 'Police Department',
          address: '258 Safety Blvd',
          phone: '(555) 890-1234',
          services: ['Emergency response', 'Community policing'],
        },
        {
          name: 'Fire Department',
          address: '369 Rescue Rd',
          phone: '(555) 901-2345',
          services: ['Fire suppression', 'EMS', 'Safety inspections'],
        },
      ],
    };

    const services = mockServices[serviceType] || [];

    return {
      content: [
        {
          type: 'text',
          text: `Local ${serviceType} services near ${location} (within ${radius} miles):\n${JSON.stringify(services, null, 2)}`,
        },
      ],
    };
  }

  async getCommunityEvents({ location, eventType, _dateRange }) {
    // Mock implementation
    const mockEvents = [
      {
        name: 'Town Hall Meeting',
        date: '2025-08-15',
        time: '7:00 PM',
        location: 'City Hall Auditorium',
        description: 'Monthly town hall meeting to discuss city issues and budget',
      },
      {
        name: 'Community Clean-up Day',
        date: '2025-08-22',
        time: '9:00 AM',
        location: 'Central Park',
        description: 'Volunteer event to clean up local parks and green spaces',
      },
      {
        name: 'Public Budget Hearing',
        date: '2025-09-01',
        time: '6:30 PM',
        location: 'City Council Chambers',
        description: 'Public hearing on proposed city budget for next fiscal year',
      },
    ];

    const filteredEvents = eventType
      ? mockEvents.filter(event => event.name.toLowerCase().includes(eventType.replace('_', ' ')))
      : mockEvents;

    return {
      content: [
        {
          type: 'text',
          text: `Community events in ${location}${eventType ? ` (${eventType})` : ''}:\n${JSON.stringify(filteredEvents, null, 2)}`,
        },
      ],
    };
  }

  async reportCivicIssue({ issueType, location, _description, priority, _contactInfo }) {
    // Mock implementation - in production, this would submit to a real civic reporting system
    const issueId = 'ISSUE-' + Date.now();
    // const reportData = { // Commented out as not currently used
    //   id: issueId,
    //   type: issueType,
    //   location,
    //   description,
    //   priority,
    //   contactInfo,
    //   status: 'submitted',
    //   submittedAt: new Date().toISOString(),
    // };

    return {
      content: [
        {
          type: 'text',
          text: `Civic issue reported successfully!\nIssue ID: ${issueId}\nType: ${issueType}\nLocation: ${location}\nPriority: ${priority}\nStatus: Submitted for review\n\nYou can track this issue using ID: ${issueId}`,
        },
      ],
    };
  }

  async getGovernmentContacts({ location, level, office }) {
    // Mock implementation
    const mockContacts = {
      local: {
        mayor: { name: 'Jane Smith', email: 'mayor@city.gov', phone: '(555) 100-0001' },
        city_council: {
          name: 'City Council Office',
          email: 'council@city.gov',
          phone: '(555) 100-0002',
        },
        city_manager: { name: 'Bob Johnson', email: 'manager@city.gov', phone: '(555) 100-0003' },
      },
      county: {
        commissioner: {
          name: 'Alice Brown',
          email: 'commissioner@county.gov',
          phone: '(555) 200-0001',
        },
        sheriff: { name: 'Tom Wilson', email: 'sheriff@county.gov', phone: '(555) 200-0002' },
      },
      state: {
        representative: {
          name: 'Rep. Sarah Davis',
          email: 'sdavis@state.gov',
          phone: '(555) 300-0001',
        },
        senator: { name: 'Sen. Mike Taylor', email: 'mtaylor@state.gov', phone: '(555) 300-0002' },
      },
      federal: {
        representative: {
          name: 'Rep. John Anderson',
          email: 'janderson@house.gov',
          phone: '(555) 400-0001',
        },
        senator: { name: 'Sen. Lisa Garcia', email: 'lgarcia@senate.gov', phone: '(555) 400-0002' },
      },
    };

    const contacts = mockContacts[level] || {};
    const specificContact = office ? contacts[office] : contacts;

    return {
      content: [
        {
          type: 'text',
          text: `Government contacts for ${location} (${level} level)${office ? ` - ${office}` : ''}:\n${JSON.stringify(specificContact, null, 2)}`,
        },
      ],
    };
  }

  async searchNonprofits({ location, cause, radius = 25 }) {
    // Mock implementation
    const mockNonprofits = [
      {
        name: 'Community Food Bank',
        cause: 'poverty',
        address: '123 Charity Lane',
        phone: '(555) 501-0001',
        website: 'www.communityfoodbank.org',
        description: 'Provides food assistance to families in need',
      },
      {
        name: 'Green Earth Initiative',
        cause: 'environment',
        address: '456 Eco Drive',
        phone: '(555) 501-0002',
        website: 'www.greenearthinitiative.org',
        description: 'Environmental conservation and education programs',
      },
      {
        name: 'Education First',
        cause: 'education',
        address: '789 Learning Blvd',
        phone: '(555) 501-0003',
        website: 'www.educationfirst.org',
        description: 'Tutoring and educational support for underserved students',
      },
      {
        name: 'Health Access Network',
        cause: 'health',
        address: '321 Wellness Way',
        phone: '(555) 501-0004',
        website: 'www.healthaccess.org',
        description: 'Healthcare access for uninsured and underinsured',
      },
    ];

    const filteredNonprofits = cause
      ? mockNonprofits.filter(np => np.cause === cause)
      : mockNonprofits;

    return {
      content: [
        {
          type: 'text',
          text: `Nonprofits near ${location}${cause ? ` (${cause} focus)` : ''} within ${radius} miles:\n${JSON.stringify(filteredNonprofits, null, 2)}`,
        },
      ],
    };
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Civic MCP Server started');
  }
}

// Start the server if this file is executed directly
if (require.main === module) {
  const server = new CivicMCPServer();
  server.start().catch(console.error);
}

module.exports = CivicMCPServer;
