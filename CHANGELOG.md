# Changelog

## [1.1.3] - 2026-02-11

### Lista completa de cambios

- refactor: Extract watch time tracking to dedicated `WatchTimeService`
- refactor: Namespace `DevTools` under `WidgetDebug` for better organization
- fix: Implement XSS protection and robust input sanitization across the app
- refactor: Centralize achievement audio handling in `AudioManager` with hardware-based pooling
- fix: Synchronize and consolidate level-up animations for consistent visual feedback
- perf: Improve audio system with smart throttling and resource optimization
- feat: Update XP system scaling tiers and progressive rewards logic
- feat: Enhance test panel with dynamic ranking, 2K/4K scaling, and HUD aesthetic
- feat: Implement hash routing and query-based navigation for static hosting
- feat: Add Viewer Wiki, Catalog Search, and Profile Percentiles to viewer app
- feat: Expand leaderboard with weekly and monthly ranking timeframes
- refactor: Implement Strategy pattern for `IdleScreenRenderer`
- feat: Redesign Xbox achievements and implement integrated XP reward system
- fix: Resolve MIME type errors and asset loading issues in subfolder deployments
- feat: Modernize technical HUD Dashboard and improve anti-spam heuristics

## [1.1.2] - 2026-02-07

### Lista completa de cambios

- feat: Centralize stream monitoring with `StreamMonitorService` to reduce redundant polling
- refactor: Modernize `UIManager` with State-to-UI pattern and modularize message pipeline
- style: Unify username branding to "Cyber Red" aesthetic for all roles (Broadcaster, VIP, Top)
- feat: Enhance Idle Mode with dynamic section titles and improved layout
- fix: Restore `regenerator-runtime` to resolve critical OBS overlay compatibility
- fix: Resolve blank idle screen issues and improve stats reliability
- style: Restore `data-stream` horizontal bar and optimize header spacing
- refactor: Clean up unused configurations and centralized constants
- perf: Improve message queue handling and anti-spam processing
- fix: Prevent achievement duplication and improve Gist persistence logic
- style: Refine achievement font sizes and visual hierarchy

## [1.1.1] - 2026-02-05

### Lista completa de cambios

- refactor: Implement centralized logging system and typed event catalog
- refactor: Consolidate achievements data and rename achievements-viewer to viewer
- feat: Implement modular command registry with middleware and permissions
- perf: Optimize and centralize text scramble animation engine
- refactor: Extract idle data orchestration from SessionStatsService and screen rendering from IdleDisplayManager
- fix: Resolve Gist persistence conflicts and improve stability in low-latency environments

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
