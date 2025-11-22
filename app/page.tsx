import { Flex } from "@mantine/core";

import { ColorSchemeToggle } from "@/components/demo/ColorSchemeToggle";
import { PopoverDemo } from "@/components/demo/PopoverDemo";
import { Welcome } from "@/components/demo/Welcome";

export default function Home() {
  return (
    <Flex direction="column" align="center" gap="xl" py="xl">
      <Welcome />
      <ColorSchemeToggle />
      <PopoverDemo />
    </Flex>
  );
}
