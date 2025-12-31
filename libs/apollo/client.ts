import { ApolloClient, HttpLink, InMemoryCache } from "@apollo/client";

function createApolloClient() {
  const httpLink = new HttpLink({
    uri:
      process.env.NEXT_PUBLIC_GRAPHQL_ENDPOINT || "http://localhost:8080/query",
    fetchOptions: {
      mode: "cors",
    },
  });

  return new ApolloClient({
    link: httpLink,
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: "cache-and-network",
      },
    },
  });
}

let apolloClient: ApolloClient | undefined;

export function getApolloClient() {
  if (!apolloClient || typeof window === "undefined") {
    apolloClient = createApolloClient();
  }
  return apolloClient;
}

export function resetApolloClient() {
  apolloClient = undefined;
}
