"use client";

import { MantineProvider } from "@mantine/core";
import type { ReactNode } from "react";

import { ApolloProvider } from "@/libs/apollo";
import { theme } from "@/libs/theme";

interface ProvidersProps {
  children: ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ApolloProvider>
      <MantineProvider theme={theme}>{children}</MantineProvider>
    </ApolloProvider>
  );
}
