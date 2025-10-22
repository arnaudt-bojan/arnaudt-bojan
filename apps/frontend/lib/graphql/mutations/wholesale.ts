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

// TODO: Backend schema gap - this mutation doesn't exist yet
// export const CANCEL_INVITATION = gql`
//   mutation CancelInvitation($invitationId: ID!) {
//     cancelInvitation(invitationId: $invitationId) {
//       id
//       status
//     }
//   }
// `;
