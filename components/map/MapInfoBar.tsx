"use client";

import { Badge, Button, Group, Paper, Text } from "@mantine/core";
import React from "react";

import type { FocusState, SiteMapHandle } from "./SiteMap";

export interface MapInfoBarProps {
  /** Current focus state from SiteMap */
  focusState: FocusState;
  /** Ref to the SiteMap for calling exitFocus/goBack */
  mapRef: React.RefObject<SiteMapHandle | null>;
  /** Current zoom level (optional) */
  zoom?: number;
}

/** admin Level names for display */
const LEVEL_NAMES: Record<number, string> = {
  0: "World",
  1: "Country",
  2: "State/Province",
  3: "District",
  4: "Sub-district",
};

export default function MapInfoBar({ focusState, mapRef, zoom }: MapInfoBarProps) {
  const { level, entityStack, hoveredRegion, isLoading } = focusState;

  // Get current focused entity name
  const currentEntity = entityStack.length > 0 ? entityStack[entityStack.length - 1] : null;

  // Build breadcrumb from entity stack
  const breadcrumb = entityStack.map((e) => e.name).join(" › ");

  return (
    <Paper
      withBorder
      p="sm"
      radius="md"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        minHeight: 50,
        background: "var(--mantine-color-dark-6)",
      }}
    >
      <Group gap="xs">
        {/* Current level indicator */}
        <Badge size="sm" color="gray" variant="outline">
          {LEVEL_NAMES[level] ?? `Level ${level}`}
        </Badge>

        {/* Breadcrumb / focused entity */}
        {breadcrumb && (
          <Badge size="lg" color="blue" variant="filled">
            {breadcrumb}
          </Badge>
        )}

        {/* Hovered region */}
        {hoveredRegion && (
          <Badge size="md" color="cyan" variant="light">
            {hoveredRegion}
          </Badge>
        )}

        {/* No selection hint */}
        {level === 0 && !hoveredRegion && (
          <Text size="sm" c="dimmed">
            Hover over a country
          </Text>
        )}

        {/* Loading indicator */}
        {isLoading && (
          <Badge size="sm" color="yellow" variant="light">
            Loading...
          </Badge>
        )}

        {/* Zoom level */}
        {zoom !== undefined && (
          <Text size="xs" c="dimmed">
            Zoom: {zoom.toFixed(1)}x
          </Text>
        )}
      </Group>

      <Group gap="xs">
        {/* Go back one level */}
        {level > 0 && (
          <Button
            onClick={() => mapRef.current?.goBack()}
            size="xs"
            variant="light"
            color="gray"
          >
            ← Back
          </Button>
        )}

        {/* Exit focus completely */}
        {level > 0 && (
          <Button
            onClick={() => mapRef.current?.exitFocus()}
            size="xs"
            variant="light"
          >
            Exit Focus
          </Button>
        )}
      </Group>
    </Paper>
  );
}
