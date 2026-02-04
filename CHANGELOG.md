# Changelog

## [1.1.0] - 2026-02-04

### Lista completa de cambios

- feat: Improve widget UX with smoother transitions and refined subscriber display
- perf: Improve text readability for OBS streaming at 1440p
- feat: Add network activity LEDs and refine visual aesthetics
- fix: Resolve achievement image display issues and unify assets
- feat: Enhance IDLE mode speedometer with premium HUD visuals
- feat: implement VS battle mode for active streaks in idle mode
- feat: improve idle stats animations and xp balance
- feat: Enhance visual elements and subscriber rank display
- style: Refine idle transitions and stabilize animations
- feat: Implement Golden Subscriber Mode and Top Subs Stats
- feat: Add kinetic typography animations and enforce bot blacklist
- style: adjust category name letter-spacing for better visibility
- feat: Add last achievement screen to idle display
- feat: Redesign idle stats summary with speedometer
- docs: Add setup guide and implementation instructions
- refactor: Centralize audio management and remove obsolete service
- feat: Add new chat commands (Help, Stats, Uptime, Emotes, Shoutout)
- feat: Implement Event Architecture and Modular Command System
- feat: synchronize watch time tracking with stream status
- refactor: decouple development tools from main application logic
- refactor: Migrate application to ES Modules
- feat: implement XPSourceEvaluator for centralized XP logic
- feat: implement LevelCalculator and refactor level logic
- refactor: extract streak logic to standalone StreakManager
- fix: Exclude bots and blacklisted users from session stats
- fix: Optimize third-party emote loading and fix console errors
- docs: add safe config.example.js template
- fix: prevent bot data leak in watch time and centralize blacklist
- fix: Resolve data loading and script errors in Achievements Viewer
- add history stream and fix achievements page background
- feat: Implement user blacklist system for bots
- feat: Expand Face Off to Best of 8 with enhanced UI and metrics
- feat: Implement comprehensive watch time tracking and idle stats
- feat: Add watch time to heatmap and implement year tabs
- feat: Implement watch time tracking and refine UI
- feat: Add holo card effect and achievement holders list
- feat: Implement advanced profile features and enhance data tracking
- fix(viewer): Correct XP calculation and refine profile UI
- feat: Implement global stats and profile enhancements in Achievements Viewer
- feat: Add and overhaul Achievements Viewer standalone page
- feat: Improve idle stats system and emote visualization
- achievement customization
- session time starts when sys.online
- sys.online can read twitch online status
- another bg for another user
- Add general achievement bar
- progress bar for some achievements
- Optimized chat backgrounds for users
- Feat: Add custom chat background support for specific VIP users
- Refactor idle stats UI: updated colors, increased fonts, simplified header/footer, and removed borders/animations
- feat: Add trending words/emotes display and fix widget positioning
- feat: improve emote-only message display without quotes and larger sizes
- Show actual twitch category and exclude wizebot and streamer in some ranks

## [1.0.0] - 2024-01-20

### Agregado

- Lanzamiento inicial de la versión 1.0 del Widget de Chat para OBS.
- Sistema de niveles y rangos.
- Integración con insignias (badges).
- Panel de pruebas (`test-panel.html`).
- Documentación del proyecto.
