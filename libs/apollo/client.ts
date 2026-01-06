import "server-only";

import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

/**
 * Server-only Apollo Client for use in Server Components and Server Actions
 * This client should never be imported in client-side code
 */
function createServerApolloClient() {
  if (!process.env.GRAPHQL_ENDPOINT) {
    throw new Error("GRAPHQL_ENDPOINT is not defined in environment variables");
  }

  const httpLink = new HttpLink({
    uri: process.env.GRAPHQL_ENDPOINT,
    fetchOptions: {
      cache: "no-store", // Disable fetch cache for server-side requests
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      query: {
        fetchPolicy: "no-cache", // Always fetch fresh data on server
      },
    },
  });
}

let serverApolloClient: ApolloClient | undefined;

/**
 * Get or create the server-side Apollo Client
 * Note: Uses GRAPHQL_ENDPOINT (not NEXT_PUBLIC_*) to keep endpoint private
 */
export function getServerApolloClient() {
  if (!serverApolloClient) {
    serverApolloClient = createServerApolloClient();
  }
  return serverApolloClient;
}
