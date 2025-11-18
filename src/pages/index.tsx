"use client";
import React, { useState } from "react";
import { Button, Title, Text, Badge, Container, Group, Paper } from "@mantine/core";
import dynamic from "next/dynamic";

const MapChart = dynamic(() => import("../components/MapChart"), { ssr: false });

export default function IndexPage() {
  const [count, setCount] = useState(0);

  return (
    <Container size="sm" style={{ paddingTop: 48, textAlign: "center" }}>
      <Title order={2} style={{ marginBottom: 12 }}>
        World Map POC — Pages Router
      </Title>

      <Text c="dimmed" style={{ marginBottom: 20 }}>
        Example page using Mantine components. Click the button to increment the
        counter below.
      </Text>

      <div style={{ marginBottom: 16 }}>
        <Badge color="teal">Current count: {count}</Badge>
      </div>

      <Group style={{ justifyContent: "center" }}>
        <Button size="md" onClick={() => setCount((c) => c + 1)}>
          Increment
        </Button>
        <Button size="md" variant="outline" onClick={() => setCount(0)}>
          Reset
        </Button>
      </Group>

      <Paper withBorder mt={24} p="md">
        <MapChart />
      </Paper>
    </Container>
  );
}