import { Container, Flex, Title } from "@mantine/core";

import { ColorSchemeToggle } from "@/components/demo/ColorSchemeToggle";
import { PopoverDemo } from "@/components/demo/PopoverDemo";
import { Welcome } from "@/components/demo/Welcome";
import { MapContainer } from "@/components/map";

export default function Home() {
  return (
    <Container size="xl" py="xl">
      <Flex direction="column" align="center" gap="xl" py="xl">
        <Welcome />
        <ColorSchemeToggle />
        <PopoverDemo />
      </Flex>
      <Flex direction="column" align="center" gap="xl">
        <Title order={1}>Interactive World Map</Title>
        <MapContainer  mapProvider="positron"/>
      </Flex>
    </Container>
  );
}
