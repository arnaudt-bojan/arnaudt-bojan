import { gql } from '@/lib/apollo-client';

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    getCurrentUser {
      id
      email
      username
      fullName
      userType
    }
  }
`;
