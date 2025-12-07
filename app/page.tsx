"use client";

import { Box, Container, Flex, Text, Title } from "@mantine/core";
import { useCallback, useRef, useState } from "react";

import { ColorSchemeToggle } from "@/components/demo/ColorSchemeToggle";
import { MapInfoBar, SiteMap } from "@/components/map";
import type { FocusState, SiteMapHandle } from "@/components/map";
import { BASE_PATH } from "@/const";

const DEFAULT_FOCUS_STATE: FocusState = {
  level: 0,
  entityStack: [],
  hoveredRegion: null,
  isLoading: false,
};

export default function Home() {

  const mapRef = useRef<SiteMapHandle>(null);
  const [focusState, setFocusState] = useState<FocusState>(DEFAULT_FOCUS_STATE);
  const [zoom, setZoom] = useState<number>(2);

  const handleFocusChange = useCallback((state: FocusState) => {
    setFocusState(state);
  }, []);

  const handleViewStateChange = useCallback((viewState: { zoom: number }) => {
    setZoom(viewState.zoom);
  }, []);


  return (
    <Container size="xl" py="xl">
      <Flex direction="column" align="center" gap="xl">
        <ColorSchemeToggle />
        <Title order={1}>Interactive World Map</Title>
        {BASE_PATH === "/react-map-poc" ? (
          <Text c="dimmed" size="sm">
            Focus mode works for USA, Thailand, and Japan
          </Text>
        ) : (
          <Text c="dimmed" size="sm">
            Click a country to focus
          </Text>
        )}

        {/* Info Bar */}
        <Box w="100%" maw={1200}>
          <MapInfoBar focusState={focusState} mapRef={mapRef} zoom={zoom} />
        </Box>

        {/* Map */}
        <SiteMap
          ref={mapRef}
          mapProvider="positron"
          style={{ width: "100%", maxWidth: 1200, height: 600, borderRadius: 8 }}
          onFocusChange={handleFocusChange}
          onViewStateChange={handleViewStateChange}
        />
      </Flex>
    </Container>
  );
}
