"use client";

import {
  createStandardLevelConfigs,
  type FocusedEntity,
  MapInfoBar,
  SiteMap,
  type SiteMapHandle,
} from "@hoshina/react-map";
import { Box, Container, Stack, Text, Title } from "@mantine/core";
import { useRef, useState } from "react";

import { mapDataLoader } from "@/libs/map/geoDataLoader";

// Create level configurations with injected data loader
const LEVEL_CONFIGS = createStandardLevelConfigs(mapDataLoader, 2);

export default function MapDemoPage() {
  const mapRef = useRef<SiteMapHandle>(null);
  const [focusedEntity, setFocusedEntity] = useState<FocusedEntity | null>(
    null,
  );
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<{
    name: string;
    isoCode?: string;
    level: number;
  } | null>(null);

  return (
    <Container fluid p={0} h="100vh">
      <Stack gap={0} h="100%">
        {/* Header */}
        <Box
          p="md"
          style={{ borderBottom: "1px solid var(--mantine-color-gray-3)" }}
        >
          <Title order={2}>Map Demo</Title>
          <Text c="dimmed" size="sm">
            Click on a country to drill down. Click states/provinces to select.
            {selectedFeature && (
              <Text span fw={500} ml="xs">
                Selected: {selectedFeature.name}
              </Text>
            )}
          </Text>
        </Box>

        {/* Map container */}
        <Box style={{ flex: 1, position: "relative" }}>
          <SiteMap
            ref={mapRef}
            levelConfigs={LEVEL_CONFIGS}
            maxLevel={2}
            onEntityChange={setFocusedEntity}
            onHover={setHoveredFeature}
            onFeatureSelect={setSelectedFeature}
          />
          <MapInfoBar
            focusedEntity={focusedEntity}
            hoveredFeature={hoveredFeature}
            onBack={() => mapRef.current?.goBack()}
            onExit={() => mapRef.current?.exitFocus()}
          />
        </Box>
      </Stack>
    </Container>
  );
}
