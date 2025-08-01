#!/usr/bin/env node

/*
 * Copyright © 2025 GALAX Civic Networking.
 * Licensed under the PolyForm Shield License 1.0.0.
 * "GALAX" and related concepts are inspired by Gatchaman Crowds © Tatsunoko Production.
 * This project is unaffiliated with Tatsunoko Production or the original anime.
 */

/**
 * GALAX Social Good APIs MCP Server
 * Social good and community service integration for the GALAX platform
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const https = require('https');

class SocialGoodMCPServer {
  constructor() {
    this.server = new Server({
      name: 'GALAX Social Good MCP Server',
      version: '1.0.0',
    }, {
      capabilities: {
        tools: {},
      },
    });

    this.volunteerApiKey = process.env.VOLUNTEER_API_KEY;
    this.charityApiKey = process.env.CHARITY_API_KEY;
    this.setupTools();
  }

  setupTools() {
    this.server.setRequestHandler('tools/list', async () => {
      return {
        tools: [
          {
            name: 'search_volunteer_opportunities',
            description: 'Find volunteer opportunities by location and cause',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location to search (city, state, or coordinates)' },
                cause: { 
                  type: 'string', 
                  enum: ['environment', 'education', 'health', 'poverty', 'disaster', 'animals', 'seniors', 'children'],
                  description: 'Cause area for volunteering'
                },
                skills: { 
                  type: 'array', 
                  items: { type: 'string' },
                  description: 'Skills or interests to match'
                },
                timeCommitment: { 
                  type: 'string', 
                  enum: ['one-time', 'weekly', 'monthly', 'ongoing'],
                  description: 'Time commitment preference'
                },
                radius: { type: 'number', description: 'Search radius in miles', default: 25 }
              },
              required: ['location']
            }
          },
          {
            name: 'get_charity_info',
            description: 'Get detailed information about a charity or nonprofit',
            inputSchema: {
              type: 'object',
              properties: {
                charityName: { type: 'string', description: 'Name of the charity' },
                ein: { type: 'string', description: 'Employer Identification Number (EIN)' },
                includeFinancials: { type: 'boolean', description: 'Include financial information', default: false }
              }
            }
          },
          {
            name: 'find_food_banks',
            description: 'Locate food banks and pantries near user',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location (address or coordinates)' },
                radius: { type: 'number', description: 'Search radius in miles', default: 15 },
                openNow: { type: 'boolean', description: 'Only show locations open now', default: false },
                services: { 
                  type: 'array', 
                  items: { 
                    type: 'string', 
                    enum: ['food_pantry', 'soup_kitchen', 'food_delivery', 'nutrition_education']
                  },
                  description: 'Specific services needed'
                }
              },
              required: ['location']
            }
          },
          {
            name: 'get_disaster_relief_info',
            description: 'Get disaster relief information and resources',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Affected area location' },
                disasterType: { 
                  type: 'string', 
                  enum: ['hurricane', 'earthquake', 'flood', 'wildfire', 'tornado', 'winter_storm'],
                  description: 'Type of disaster'
                },
                needType: { 
                  type: 'string', 
                  enum: ['shelter', 'food', 'medical', 'supplies', 'transportation', 'financial_aid'],
                  description: 'Type of assistance needed'
                }
              },
              required: ['location']
            }
          },
          {
            name: 'search_community_resources',
            description: 'Search for various community resources and support services',
            inputSchema: {
              type: 'object',
              properties: {
                location: { type: 'string', description: 'Location to search' },
                resourceType: { 
                  type: 'string', 
                  enum: ['housing', 'healthcare', 'job_training', 'childcare', 'mental_health', 'substance_abuse', 'legal_aid'],
                  description: 'Type of resource needed'
                },
                eligibility: { 
                  type: 'object',
                  properties: {
                    income_level: { type: 'string', enum: ['low', 'moderate', 'any'] },
                    family_size: { type: 'number' },
                    age_group: { type: 'string', enum: ['children', 'adults', 'seniors', 'any'] }
                  },
                  description: 'Eligibility criteria'
                },
                radius: { type: 'number', description: 'Search radius in miles', default: 20 }
              },
              required: ['location', 'resourceType']
            }
          },
          {
            name: 'report_community_need',
            description: 'Report a community need or request for help',
            inputSchema: {
              type: 'object',
              properties: {
                needType: { 
                  type: 'string', 
                  enum: ['food_insecurity', 'housing', 'healthcare', 'education', 'disaster_relief', 'elder_care', 'child_care'],
                  description: 'Type of community need'
                },
                location: { type: 'string', description: 'Location where help is needed' },
                description: { type: 'string', description: 'Detailed description of the need' },
                urgency: { 
                  type: 'string', 
                  enum: ['low', 'medium', 'high', 'emergency'],
                  description: 'Urgency level'
                },
                contactInfo: { type: 'string', description: 'Contact information for follow-up' },
                estimatedPeopleAffected: { type: 'number', description: 'Number of people affected' }
              },
              required: ['needType', 'location', 'description', 'urgency']
            }
          }
        ]
      };
    });

    this.server.setRequestHandler('tools/call', async (request) => {
      const { name, arguments: args } = request.params;

      switch (name) {
        case 'search_volunteer_opportunities':
          return this.searchVolunteerOpportunities(args);
        case 'get_charity_info':
          return this.getCharityInfo(args);
        case 'find_food_banks':
          return this.findFoodBanks(args);
        case 'get_disaster_relief_info':
          return this.getDisasterReliefInfo(args);
        case 'search_community_resources':
          return this.searchCommunityResources(args);
        case 'report_community_need':
          return this.reportCommunityNeed(args);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    });
  }

  async searchVolunteerOpportunities({ location, cause, skills = [], timeCommitment, radius = 25 }) {
    // Mock implementation - in production, integrate with VolunteerMatch, JustServe, or similar APIs
    const mockOpportunities = [
      {
        id: 'vol_001',
        title: 'Community Garden Maintenance',
        organization: 'Green City Initiative',
        cause: 'environment',
        location: 'Central Park Community Garden',
        address: '123 Park Ave',
        description: 'Help maintain our community garden by planting, weeding, and harvesting.',
        skills_needed: ['gardening', 'physical_work'],
        time_commitment: 'weekly',
        schedule: 'Saturdays 9:00 AM - 12:00 PM',
        contact: 'volunteers@greencity.org',
        background_check_required: false
      },
      {
        id: 'vol_002',
        title: 'Reading Tutor for Children',
        organization: 'Literacy First',
        cause: 'education',
        location: 'Downtown Library',
        address: '456 Main St',
        description: 'Provide one-on-one reading support for elementary school children.',
        skills_needed: ['teaching', 'patience', 'communication'],
        time_commitment: 'weekly',
        schedule: 'Weekdays 3:30 PM - 5:30 PM',
        contact: 'tutors@literacyfirst.org',
        background_check_required: true
      },
      {
        id: 'vol_003',
        title: 'Meal Prep for Seniors',
        organization: 'Senior Care Network',
        cause: 'seniors',
        location: 'Senior Center',
        address: '789 Elder Way',
        description: 'Help prepare and package meals for homebound seniors.',
        skills_needed: ['cooking', 'food_safety'],
        time_commitment: 'monthly',
        schedule: 'First Saturday of each month, 8:00 AM - 2:00 PM',
        contact: 'volunteers@seniorcare.org',
        background_check_required: false
      },
      {
        id: 'vol_004',
        title: 'Hospital Patient Support',
        organization: 'City General Hospital',
        cause: 'health',
        location: 'City General Hospital',
        address: '321 Medical Dr',
        description: 'Provide companionship and support to patients and families.',
        skills_needed: ['empathy', 'communication', 'reliability'],
        time_commitment: 'weekly',
        schedule: 'Flexible shifts available',
        contact: 'volunteer@citygeneral.org',
        background_check_required: true
      }
    ];

    let filteredOpportunities = mockOpportunities;

    if (cause) {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.cause === cause);
    }

    if (skills.length > 0) {
      filteredOpportunities = filteredOpportunities.filter(opp => 
        skills.some(skill => opp.skills_needed.includes(skill))
      );
    }

    if (timeCommitment) {
      filteredOpportunities = filteredOpportunities.filter(opp => opp.time_commitment === timeCommitment);
    }

    return {
      content: [{
        type: 'text',
        text: `Volunteer opportunities near ${location}${cause ? ` (${cause} focus)` : ''} within ${radius} miles:\n${JSON.stringify(filteredOpportunities, null, 2)}`
      }]
    };
  }

  async getCharityInfo({ charityName, ein, includeFinancials = false }) {
    // Mock implementation - in production, integrate with Charity Navigator, GuideStar, or IRS APIs
    const mockCharityData = {
      name: charityName || 'Community Action Network',
      ein: ein || '12-3456789',
      mission: 'To strengthen communities through volunteer action and civic engagement.',
      founded: '1998',
      location: {
        headquarters: 'Springfield, IL',
        serves: 'Illinois and surrounding states'
      },
      programs: [
        'Community Organizing',
        'Disaster Relief',
        'Youth Development',
        'Environmental Justice'
      ],
      contact: {
        phone: '(555) 123-4567',
        email: 'info@communityaction.org',
        website: 'www.communityaction.org'
      },
      ratings: {
        charity_navigator: '4 stars',
        transparency: '92%',
        accountability: '95%'
      },
      volunteer_opportunities: 15,
      staff_size: 45,
      board_size: 12
    };

    if (includeFinancials) {
      mockCharityData.financials = {
        total_revenue: '$2,450,000',
        program_expenses_ratio: '85%',
        administrative_expenses_ratio: '10%',
        fundraising_expenses_ratio: '5%',
        assets: '$1,200,000',
        liabilities: '$150,000'
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Charity information${charityName ? ` for ${charityName}` : ''}:\n${JSON.stringify(mockCharityData, null, 2)}`
      }]
    };
  }

  async findFoodBanks({ location, radius = 15, openNow = false, services = [] }) {
    // Mock implementation
    const mockFoodBanks = [
      {
        name: 'Central Food Bank',
        type: 'food_pantry',
        address: '123 Charity Lane',
        phone: '(555) 234-5678',
        hours: {
          monday: '9:00 AM - 5:00 PM',
          tuesday: '9:00 AM - 5:00 PM',
          wednesday: '9:00 AM - 5:00 PM',
          thursday: '9:00 AM - 5:00 PM',
          friday: '9:00 AM - 5:00 PM',
          saturday: '9:00 AM - 2:00 PM',
          sunday: 'Closed'
        },
        services: ['food_pantry', 'nutrition_education'],
        eligibility: 'Income verification required',
        distance: '2.3 miles',
        currently_open: true
      },
      {
        name: 'Community Kitchen',
        type: 'soup_kitchen',
        address: '456 Service St',
        phone: '(555) 345-6789',
        hours: {
          monday: '11:00 AM - 2:00 PM',
          tuesday: '11:00 AM - 2:00 PM',
          wednesday: '11:00 AM - 2:00 PM',
          thursday: '11:00 AM - 2:00 PM',
          friday: '11:00 AM - 2:00 PM',
          saturday: 'Closed',
          sunday: 'Closed'
        },
        services: ['soup_kitchen'],
        eligibility: 'No requirements - all welcome',
        distance: '4.7 miles',
        currently_open: false
      },
      {
        name: 'Mobile Food Pantry',
        type: 'food_delivery',
        phone: '(555) 456-7890',
        schedule: 'Visits different neighborhoods weekly',
        services: ['food_delivery', 'food_pantry'],
        eligibility: 'Homebound individuals and families',
        next_delivery: 'Friday 10:00 AM - Elm Street Community Center',
        distance: 'Varies by location'
      }
    ];

    let filteredFoodBanks = mockFoodBanks;

    if (openNow) {
      filteredFoodBanks = filteredFoodBanks.filter(fb => fb.currently_open);
    }

    if (services.length > 0) {
      filteredFoodBanks = filteredFoodBanks.filter(fb => 
        services.some(service => fb.services.includes(service))
      );
    }

    return {
      content: [{
        type: 'text',
        text: `Food banks and pantries near ${location} within ${radius} miles${openNow ? ' (open now)' : ''}:\n${JSON.stringify(filteredFoodBanks, null, 2)}`
      }]
    };
  }

  async getDisasterReliefInfo({ location, disasterType, needType }) {
    // Mock implementation
    const mockReliefInfo = {
      location,
      disaster_type: disasterType,
      current_status: 'Active response phase',
      emergency_contacts: {
        emergency_services: '911',
        red_cross: '1-800-RED-CROSS',
        local_emergency_management: '(555) 987-6543'
      },
      shelter_locations: [
        {
          name: 'Community Center Emergency Shelter',
          address: '123 Safe Haven Dr',
          capacity: '200 people',
          amenities: ['Meals', 'Medical care', 'Pet-friendly'],
          contact: '(555) 111-2222'
        },
        {
          name: 'High School Gymnasium',
          address: '456 School Rd',
          capacity: '150 people',
          amenities: ['Meals', 'Cots', 'Phone charging'],
          contact: '(555) 333-4444'
        }
      ],
      relief_services: {
        food_distribution: {
          location: 'Fairgrounds - Building A',
          schedule: 'Daily 8:00 AM - 6:00 PM',
          requirements: 'ID and proof of address in affected area'
        },
        medical_assistance: {
          location: 'Mobile Medical Unit - Main Street',
          schedule: '24/7',
          services: ['First aid', 'Prescription refills', 'Mental health support']
        },
        financial_assistance: {
          organization: 'FEMA Disaster Relief',
          application: 'disasterassistance.gov or call 1-800-621-3362',
          types: ['Housing assistance', 'Repair grants', 'Personal property assistance']
        }
      },
      volunteer_needs: [
        'Shelter volunteers',
        'Food distribution',
        'Cleanup crews',
        'Translation services'
      ],
      donations_needed: [
        'Non-perishable food',
        'Water bottles',
        'Blankets and pillows',
        'Personal hygiene items'
      ]
    };

    return {
      content: [{
        type: 'text',
        text: `Disaster relief information for ${location}${disasterType ? ` (${disasterType})` : ''}:\n${JSON.stringify(mockReliefInfo, null, 2)}`
      }]
    };
  }

  async searchCommunityResources({ location, resourceType, eligibility = {}, radius = 20 }) {
    // Mock implementation
    const mockResources = {
      housing: [
        {
          name: 'Housing Authority of Springfield',
          services: ['Public housing', 'Section 8 vouchers', 'First-time homebuyer assistance'],
          address: '123 Housing Blvd',
          phone: '(555) 678-9012',
          eligibility: 'Income limits apply',
          website: 'www.springfieldhousing.org'
        },
        {
          name: 'Emergency Housing Services',
          services: ['Emergency shelter', 'Transitional housing', 'Rapid rehousing'],
          address: '456 Support Ave',
          phone: '(555) 789-0123',
          eligibility: 'Homeless or at risk of homelessness',
          hours: '24/7 intake'
        }
      ],
      healthcare: [
        {
          name: 'Community Health Center',
          services: ['Primary care', 'Dental', 'Mental health', 'Pharmacy'],
          address: '789 Wellness Way',
          phone: '(555) 890-1234',
          eligibility: 'Sliding fee scale based on income',
          insurance_accepted: ['Medicaid', 'Medicare', 'Uninsured welcome']
        },
        {
          name: 'Free Clinic Network',
          services: ['Basic medical care', 'Preventive care', 'Health screenings'],
          address: '321 Care St',
          phone: '(555) 901-2345',
          eligibility: 'Uninsured individuals below 200% poverty level',
          hours: 'Saturdays 8:00 AM - 2:00 PM'
        }
      ],
      job_training: [
        {
          name: 'Workforce Development Center',
          services: ['Job placement', 'Skills training', 'Resume assistance', 'Interview prep'],
          address: '654 Career Lane',
          phone: '(555) 012-3456',
          programs: ['Healthcare', 'Manufacturing', 'IT', 'Customer service'],
          eligibility: 'Open to all job seekers'
        }
      ],
      childcare: [
        {
          name: 'Head Start Program',
          services: ['Preschool education', 'Health services', 'Nutrition', 'Parent support'],
          address: '987 Learning Dr',
          phone: '(555) 123-4567',
          age_range: '3-5 years old',
          eligibility: 'Income guidelines apply'
        }
      ]
    };

    const resources = mockResources[resourceType] || [];

    return {
      content: [{
        type: 'text',
        text: `${resourceType.replace('_', ' ')} resources near ${location} within ${radius} miles:\n${JSON.stringify(resources, null, 2)}`
      }]
    };
  }

  async reportCommunityNeed({ needType, location, description, urgency, contactInfo, estimatedPeopleAffected }) {
    // Mock implementation - in production, this would integrate with community need tracking systems
    const needId = 'NEED-' + Date.now();
    const reportData = {
      id: needId,
      type: needType,
      location,
      description,
      urgency,
      contact_info: contactInfo,
      people_affected: estimatedPeopleAffected,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      estimated_response_time: this.getEstimatedResponseTime(urgency)
    };

    return {
      content: [{
        type: 'text',
        text: `Community need reported successfully!\n\nReport ID: ${needId}\nType: ${needType}\nLocation: ${location}\nUrgency: ${urgency}\nStatus: Submitted for review\n\nEstimated response time: ${reportData.estimated_response_time}\n\nYour report has been forwarded to relevant community organizations and local authorities. You can track this need using ID: ${needId}`
      }]
    };
  }

  getEstimatedResponseTime(urgency) {
    const responseMap = {
      emergency: '1-2 hours',
      high: '24-48 hours',
      medium: '3-7 days',
      low: '1-2 weeks'
    };
    return responseMap[urgency] || '1-2 weeks';
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.log('Social Good MCP Server started');
  }
}

// Start the server if this file is executed directly
if (require.main === module) {
  const server = new SocialGoodMCPServer();
  server.start().catch(console.error);
}

module.exports = SocialGoodMCPServer;