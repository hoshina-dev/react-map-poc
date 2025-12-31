import { Button, Flex, SimpleGrid, Stack, Text, Title } from "@mantine/core";

import { ColorSchemeToggle } from "@/components/demo/ColorSchemeToggle";
import { PopoverDemo } from "@/components/demo/PopoverDemo";
import { Welcome } from "@/components/demo/Welcome";

const DEMOS = [
  {
    title: "Interactive Map",
    href: "/demo/map",
    description:
      "Explore the interactive map with drill-down navigation. Click countries to zoom into admin boundaries (states/provinces), select regions, and smoothly navigate back.",
  },
  {
    title: "Admin Areas GraphQL",
    href: "/demo/admin-areas",
    description:
      "View raw GraphQL query results for admin areas at different levels. Useful for debugging and understanding the API response structure.",
  },
];

export default function Home() {
  return (
    <Stack gap="xl" py="xl" px="md">
      <Welcome />

      <Stack gap="md" align="center">
        <Title order={2} ta="center">
          Demos
        </Title>
        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" maw={1200} w="100%">
          {DEMOS.map((demo) => (
            <Stack
              key={demo.href}
              gap="md"
              p="md"
              style={{
                border: "1px solid var(--mantine-color-gray-3)",
                borderRadius: "var(--mantine-radius-md)",
              }}
            >
              <div>
                <Title order={3} size="h5">
                  {demo.title}
                </Title>
                <Text size="sm" c="dimmed">
                  {demo.description}
                </Text>
              </div>
              <Button component="a" href={demo.href} variant="light" fullWidth>
                Open Demo
              </Button>
            </Stack>
          ))}
        </SimpleGrid>
      </Stack>

      <Flex direction="column" align="center" gap="md">
        <Title order={3}>Components</Title>
        <Flex gap="md" wrap="wrap" justify="center">
          <ColorSchemeToggle />
          <PopoverDemo />
        </Flex>
      </Flex>
    </Stack>
  );
}
