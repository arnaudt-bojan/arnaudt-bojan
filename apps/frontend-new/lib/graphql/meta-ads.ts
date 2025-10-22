import { gql } from '@apollo/client';

export const GET_PRODUCTS = gql`
  query GetProducts {
    listProducts(first: 100) {
      edges {
        node {
          id
          name
          description
          price
          image
        }
      }
    }
  }
`;

export const GENERATE_AD_COPY = gql`
  mutation GenerateAdCopy($productId: ID!, $objective: String!) {
    generateAdCopy(productId: $productId, objective: $objective) {
      headline
      description
      cta
    }
  }
`;

export const CREATE_CAMPAIGN = gql`
  mutation CreateCampaign($input: CreateCampaignInput!) {
    createCampaign(input: $input) {
      id
      name
      status
    }
  }
`;

export const GET_META_STATS = gql`
  query GetMetaAdsStats {
    metaAdsStats {
      activeCampaigns
      totalSpend
      totalImpressions
      totalClicks
      averageCtr
      connectionStatus
    }
  }
`;

export const LIST_CAMPAIGNS = gql`
  query ListMetaCampaigns {
    listMetaCampaigns {
      id
      name
      status
      objective
      budget
      spend
      impressions
      clicks
      ctr
      conversions
      roas
      createdAt
      endDate
    }
  }
`;

export const PAUSE_CAMPAIGN = gql`
  mutation PauseCampaign($id: ID!) {
    pauseCampaign(id: $id) {
      id
      status
    }
  }
`;

export const ACTIVATE_CAMPAIGN = gql`
  mutation ActivateCampaign($id: ID!) {
    activateCampaign(id: $id) {
      id
      status
    }
  }
`;

export const DELETE_CAMPAIGN = gql`
  mutation DeleteCampaign($id: ID!) {
    deleteCampaign(id: $id) {
      success
    }
  }
`;

export const GET_CAMPAIGN_ANALYTICS = gql`
  query GetCampaignAnalytics($campaignId: ID, $startDate: String!, $endDate: String!) {
    campaignAnalytics(campaignId: $campaignId, dateRange: { startDate: $startDate, endDate: $endDate }) {
      totalSpend
      totalImpressions
      totalClicks
      totalConversions
      ctr
      cpc
      cpm
      roas
      dailyMetrics {
        date
        spend
        impressions
        clicks
        conversions
        ctr
      }
    }
  }
`;
