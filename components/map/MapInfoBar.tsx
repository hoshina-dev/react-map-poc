"use client";

import { Badge, Button, Group, Paper, Text } from "@mantine/core";
import React from "react";

interface MapInfoBarProps {
  focusedCountry: string | null;
  hoveredRegion: string | null;
  loading: boolean;
  zoom?: number;
  onExitFocus: () => void;
}

export default function MapInfoBar({
  focusedCountry,
  hoveredRegion,
  loading,
  zoom,
  onExitFocus,
}: MapInfoBarProps) {
  return (
    <Paper
      withBorder
      p="sm"
      mb="xs"
      radius="md"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 50,
      }}
    >
      <Group gap="xs">
        {focusedCountry && (
          <Badge size="lg" color="blue" variant="filled">
            Focused: {focusedCountry}
          </Badge>
        )}
        {hoveredRegion && (
          <Badge size="md" color="cyan" variant="light">
            {hoveredRegion}
          </Badge>
        )}
        {loading && (
          <Badge size="sm" color="gray" variant="light">
            Loading...
          </Badge>
        )}
        {zoom && (
          <Text size="xs" c="dimmed">
            Zoom: {zoom.toFixed(1)}x
          </Text>
        )}
      </Group>
      <Group gap="xs">
        {focusedCountry && (
          <Button onClick={onExitFocus} size="xs" variant="light">
            Exit Focus Mode
          </Button>
        )}
      </Group>
    </Paper>
  );
}
