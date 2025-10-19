import { gql } from "urql";

export const ASSETS_QUERY = gql`
  query Assets {
    assets {
      id
      symbol
      decimals
    }
  }
`;
