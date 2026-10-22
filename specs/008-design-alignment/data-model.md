# Data Model: Ajuste de la aplicación al nuevo diseño del menú y del login

**Feature**: `008-design-alignment` · **Fecha**: 2026-10-22

Esta feature **no añade ni cambia datos**: no hay tipos nuevos en `packages/shared`, ni colecciones, ni endpoints. Solo cambia cómo se muestran datos que ya existen.

| Dato | Origen | Uso en esta feature |
|---|---|---|
| `AuthUser.name` | 001 / 003 (`packages/shared/src/types/auth.ts`) | Primera línea del pie, recortada con `title` completo |
| `AuthUser.roleName` | 003 | Segunda línea del pie: «rol · canal» |
| Canal («Web» / «Escritorio») | `isDesktop()` en el cliente (005) | Segunda línea del pie |
| Estado plegado | `localStorage['navigation.collapsed']` (005, `useNavCollapsed`) | Texto e icono del elemento de plegar; sin cambios en cómo se guarda |
