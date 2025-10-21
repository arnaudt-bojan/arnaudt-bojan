import { gql } from '@/lib/apollo-client';

export const CREATE_WHOLESALE_INVITATION = gql`
  mutation CreateWholesaleInvitation($input: CreateWholesaleInvitationInput!) {
    createWholesaleInvitation(input: $input) {
      id
      buyerEmail
      token
    }
  }
`;

export const CANCEL_INVITATION = gql`
  mutation CancelInvitation($invitationId: ID!) {
    cancelInvitation(invitationId: $invitationId) {
      id
      status
    }
  }
`;
