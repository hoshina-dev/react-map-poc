# Data Flow: SiteMap & Backend

This document describes how the SiteMap component communicates with the backend and how data flows for both focus (click/select) and hover (mouse over) interactions.

---

## 1. Focus (Click/Select) Flow

```plaintext
[SiteMap]
   |
   | (user clicks a country/state: sends country name, lat, lng, zoom/focus level)
   v
[geoDataProvider / geoDataService]
   |
   | (fetches: /api/geo/admin/{country-name})
   v
[Backend (FastAPI)]
   |
   | (loads and returns TopoJSON/GeoJSON for that country)
   v
[geoDataProvider]
   |
   | (parses, filters, and provides only the relevant admin boundaries)
   v
[SiteMap]
   |
   | (renders the focused country/state boundaries)
   v
[User sees focused region]
```

---

## 2. Hover (Mouse Over) Flow

```plaintext
[SiteMap]
   |
   | (user hovers over a feature: gets feature info from already-loaded GeoJSON)
   v
[geoDataProvider]
   |
   | (no backend call; uses in-memory data to show tooltip/info)
   v
[SiteMap]
   |
   | (renders hover highlight/tooltip)
   v
[User sees hover info]
```

---

## Block Diagram

```plaintext
          +-------------------+         +-------------------+         +-------------------+
          |     SiteMap       | <-----> | geoDataProvider   | <-----> |   Backend API     |
          +-------------------+         +-------------------+         +-------------------+
                 | (user click/focus)           | (fetches GeoJSON)           | (serves GeoJSON)
                 |----------------------------->|---------------------------->|
                 |                              |                             |
                 |<-----------------------------|<----------------------------|
                 | (renders focused region)     | (parses/filters data)       | (returns data)
                 |
                 |
                 | (user hover)
                 |----------------------------->| (uses in-memory data)
                 |<-----------------------------|
                 | (renders hover highlight)
```

---

- **Focus:** On click, SiteMap requests region data from the backend via geoDataProvider, which fetches and parses the relevant GeoJSON/TopoJSON.
- **Hover:** On hover, SiteMap uses already-loaded data in memory—no backend call is made.
