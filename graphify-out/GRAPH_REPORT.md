# Graph Report - .  (2026-07-09)

## Corpus Check
- cluster-only mode — file stats not available

## Summary
- 3045 nodes · 7827 edges · 157 communities (149 shown, 8 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 19 edges (avg confidence: 0.67)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `4f26d080`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- mmr.ts
- RitualDoutrina.tsx
- useMotionSafeBool
- page.tsx
- hooks.ts
- pro-card.tsx
- page.tsx
- server.ts
- honor-rank-medal.tsx
- button.tsx
- chat-bar.tsx
- index.ts
- user-hover-card.tsx
- shared.tsx
- server.ts
- page.tsx
- cn
- middleware.ts
- user-modals.tsx
- createServiceClient
- levels.ts
- page.tsx
- createClient
- admin-coach-detail.tsx
- actions.ts
- HonorRank
- actions.ts
- bot-server.js
- card.tsx
- dependencies
- xpProgress
- page.tsx
- identities.ts
- route.ts
- lobby-room.tsx
- requireAdmin
- match-detail.tsx
- confirm.tsx
- match-stats.ts
- actions.ts
- subscription.ts
- profile-page.tsx
- maps-panel.tsx
- page.tsx
- spike.js
- match-build.ts
- client.ts
- actions.ts
- useToast
- match-coordination.ts
- actions.ts
- criar-lobby-form.tsx
- components.json
- dashboard-grid.tsx
- page.tsx
- play-menu.tsx
- cockpit-action-panel.tsx
- match-feed-cards.tsx
- compilerOptions
- package.json
- top-bar.tsx
- env.ts
- toast.tsx
- page.tsx
- dependencies
- cosmetics.ts
- actions.ts
- navigation.tsx
- ready-check-overlay.tsx
- lobbies-content.tsx
- novidades-view.tsx
- actions.ts
- actions.ts
- heroes.ts
- compilerOptions
- cosmetics.ts
- mini-profile-panel.tsx
- right-sidebar.tsx
- heatmap-panel.tsx
- xp-avatar-ring.tsx
- devDependencies
- graphs-panel.tsx
- queue-panel.tsx
- profile-stats-card.tsx
- profile.ts
- cosmetics.ts
- career.ts
- admin-pros-data.ts
- stats-actions.ts
- bottom-bar.tsx
- queue-searchers-panel.tsx
- deploy
- setup-channels.ts
- steam.ts
- page.tsx
- shell-skeleton.tsx
- page.tsx
- times-content.tsx
- match-scoreboard.tsx
- plans-view.tsx
- scripts
- setup-discord-roles.mjs
- lobby-invites.ts
- page.tsx
- route.ts
- actions.ts
- page.tsx
- AmbientLayer.tsx
- clean_vtt.py
- apply-migration-008.mjs
- page.tsx
- room-actions.tsx
- tab-conduta.tsx
- discord-sync.ts
- process-honor-medals.py
- team-detail-actions.tsx
- merge-i18n.mjs
- seo.ts
- opendota.ts
- hooks.ts
- apply-migration-005.mjs
- gen-heroes.ts
- actions.ts
- dota-heroes.ts
- vercel.json
- gen-items.ts
- coaching-review-panel.tsx
- get-refresh-token.js
- package.json
- combine-leak.mjs
- combine-quiz.mjs
- extract-incoming.mjs
- gen-abilities.ts
- stripe-setup.ts
- finalize-actions.ts
- profile-stats.tsx
- next.config.ts
- build-sound-sprite.sh
- match.js
- eslint.config.mjs
- postcss.config.mjs
- sw.js

## God Nodes (most connected - your core abstractions)
1. `createClient` - 315 edges
2. `cn()` - 161 edges
3. `createServiceClient()` - 90 edges
4. `ClientShell()` - 53 edges
5. `useToast()` - 48 edges
6. `xpProgress()` - 43 edges
7. `Link` - 41 edges
8. `Button` - 40 edges
9. `createClient()` - 39 edges
10. `useMotionSafeBool()` - 32 edges

## Surprising Connections (you probably didn't know these)
- `MmrPanel()` --indirect_call--> `tick()`  [INFERRED]
  src/components/match/tabs/mmr-panel.tsx → bot-steam/realtime.js
- `CountUp()` --indirect_call--> `tick()`  [INFERRED]
  src/components/ui/count-up.tsx → bot-steam/realtime.js
- `LiveMatchTelemetry()` --indirect_call--> `tick()`  [INFERRED]
  src/components/match/live-match-telemetry.tsx → bot-steam/realtime.js
- `MatchDetail()` --references--> `css`  [EXTRACTED]
  src/components/match/match-detail.tsx → components.json
- `DialogContent()` --references--> `react`  [EXTRACTED]
  src/components/ui/dialog.tsx → package.json

## Import Cycles
- None detected.

## Communities (157 total, 8 thin omitted)

### Community 0 - "mmr.ts"
Cohesion: 0.06
Nodes (64): loadEnv(), main(), APPLY, assignedPositionsFor(), env, envPath, main(), mean() (+56 more)

### Community 1 - "RitualDoutrina.tsx"
Cohesion: 0.06
Nodes (55): answerInput, AnswerResult, availablePermissions(), DoctrineProgress, getDoctrineProgress(), QUESTION_MAP, readLevel(), readProgress() (+47 more)

### Community 2 - "useMotionSafeBool"
Cohesion: 0.05
Nodes (55): CalibrationGraduation(), CalibrationGraduationProps, Phase, formatNextSlot(), getOfflineText(), NextSlot, PresenceLive(), PresenceLiveCompact() (+47 more)

### Community 3 - "page.tsx"
Cohesion: 0.05
Nodes (47): CALIBRATION_STATES, COLOR_TOKENS, MOCK_MATCH_PLAYED_AT, MOCK_QUEUE_ACTIVE_SLOTS, MOCK_QUEUE_WAITING_LIST, PRESENCE_STATUSES, PAGES_SYSTEM_A, PAGES_SYSTEM_B (+39 more)

### Community 4 - "hooks.ts"
Cohesion: 0.07
Nodes (26): metadata, viewport, MotionProvider(), MotionProviderProps, PremiumBackdrop(), SoundProvider(), SoundProviderProps, ServiceWorkerRegister() (+18 more)

### Community 5 - "pro-card.tsx"
Cohesion: 0.06
Nodes (46): HeroVideoBackdrop(), BORDER_ACCENT_CLASSES, formatDelta(), ProCard(), ProCardBorderAccent, ProCardProps, QueueBlock(), QueueBlockProps (+38 more)

### Community 6 - "page.tsx"
Cohesion: 0.07
Nodes (36): AXIS, DailyAreaChart(), DailyPoint, RevenueBarChart(), RevenuePoint, shortDay(), shortMonth(), TOOLTIP_STYLE (+28 more)

### Community 7 - "server.ts"
Cohesion: 0.09
Nodes (33): AdminLayout(), AdminProsPage(), metadata, CheckoutPage(), formatBRL(), PageProps, HomePage(), RankedComProPage() (+25 more)

### Community 8 - "honor-rank-medal.tsx"
Cohesion: 0.06
Nodes (42): CoachProfilePage(), generateMetadata(), isLegacyTierId(), LEGACY_TIER_IDS, PackageRow, PageProps, PriceHistoryRow, toHonorRank() (+34 more)

### Community 9 - "button.tsx"
Cohesion: 0.06
Nodes (36): ForceFilaButton(), StudentNoteRow(), ComponentsPage(), ActiveSession, MatchCoordinationClientProps, formatNextSlot(), FreeBar(), FreeBarProps (+28 more)

### Community 10 - "chat-bar.tsx"
Cohesion: 0.08
Nodes (33): sendLobbyMessage(), fetchConversationMessages(), fetchDmInbox(), markConversationRead(), openConversation(), OpenConversationResult, sendDirectMessage(), SendDmResult (+25 more)

### Community 11 - "index.ts"
Cohesion: 0.08
Nodes (28): COMPARISONS, MEDAL_DATA, ATTR_ICONS, DOTA_BACKGROUNDS, DOTA_UI_ART, FRONTIER_ASSETS, HERO_SLUGS, heroPortrait() (+20 more)

### Community 12 - "user-hover-card.tsx"
Cohesion: 0.09
Nodes (33): acceptFriendRequest(), blockUser(), rejectFriendRequest(), removeFriend(), escapeLike(), PlayerSearchResult, QuerySchema, searchPlayers() (+25 more)

### Community 13 - "shared.tsx"
Cohesion: 0.10
Nodes (22): MatchDetail(), fmtK(), fmtPct(), mmss(), PlayerLabel(), splitTeams(), StatColumn, StatTable() (+14 more)

### Community 14 - "server.ts"
Cohesion: 0.09
Nodes (30): requireApiKey(), safeEqual(), generalRoomRouter, matchRoomRouter, voiceRouter, app, startHttpServer(), discordClient (+22 more)

### Community 15 - "page.tsx"
Cohesion: 0.09
Nodes (35): MetaContent(), MetaPage(), VALID_POSITIONS, barPct(), Chip(), href(), MetaFilters(), MetaFilterState (+27 more)

### Community 16 - "cn"
Cohesion: 0.08
Nodes (27): react, RevenueResult, FontHeader(), FontHeaderProps, SampleRow(), SampleRowProps, TypographySection(), CockpitQueueList() (+19 more)

### Community 17 - "middleware.ts"
Cohesion: 0.09
Nodes (31): setLocale(), isLocale(), Locale, LOCALE_LABELS, localeFromAcceptLanguage(), localeFromCountry(), LOCALES, SPANISH_AMERICA (+23 more)

### Community 18 - "user-modals.tsx"
Cohesion: 0.11
Nodes (27): CoachNoteEntry, CoachNotesPanelProps, AdjustFichasResult, adjustUserFichasAdmin(), AdminCheckResult, applyCoachNote(), applyHonorBonus(), ApplyHonorBonusResult (+19 more)

### Community 19 - "createServiceClient"
Cohesion: 0.08
Nodes (24): getMyProRevenue(), pausePro(), PromoResult, PromoteCoachInput, promoveCoach(), resumePro(), revokeCoachStatus(), FeatureFlagsPanel() (+16 more)

### Community 20 - "levels.ts"
Cohesion: 0.10
Nodes (24): CompendiumPage(), fetchLobbyRoom(), fetchOpenLobbies(), PartidaPage(), ProgressoPage(), CompendiumView(), Props, AchievementRow (+16 more)

### Community 21 - "page.tsx"
Cohesion: 0.13
Nodes (24): CoachRow, CockpitData, CockpitStudent, getProCockpitData(), fetchCockpitData(), CenterProps, DashboardCenter(), HeroVideoBackdropProps (+16 more)

### Community 22 - "createClient"
Cohesion: 0.07
Nodes (51): acceptPartyInvite(), declinePartyInvite(), enterPartyQueue(), fetchMyParty(), fetchMyPartyInvites(), fetchPartyInvitesDetailed(), kickPartyMember(), leaveParty() (+43 more)

### Community 23 - "admin-coach-detail.tsx"
Cohesion: 0.14
Nodes (27): AdminActivePTPanel(), Props, AdminCoachDetail(), DetailHeader(), Props, QueueSection(), AdminCoachChip(), AdminCoachListRow() (+19 more)

### Community 24 - "actions.ts"
Cohesion: 0.11
Nodes (26): DoutrinaPage(), SuspendedPage(), acceptInvite(), createTeamSchema, declineInvite(), escapeLike(), inviteSchema, inviteToTeam() (+18 more)

### Community 25 - "HonorRank"
Cohesion: 0.12
Nodes (28): C, column(), Image(), row(), size, Props, ProfilePage(), DotaRank (+20 more)

### Community 26 - "actions.ts"
Cohesion: 0.10
Nodes (27): addCoachNote(), AddCoachNoteInput, addCoachNoteSchema, getMyStudents(), getStudentHonorHistory(), HonorLedgerEntry, TODO: disparar webhook Discord para notificar Pedro, recommendPromotion() (+19 more)

### Community 27 - "bot-server.js"
Cohesion: 0.10
Nodes (32): anunciarEntrada(), capturaLobby(), client, {
  CMsgInviteToLobby,
  CMsgSOCacheSubscribed,
  CMsgSOMultipleObjects,
  CSODOTALobby,
}, { createClient }, descartarLobbySteam(), dota2, { Dota2User } (+24 more)

### Community 28 - "card.tsx"
Cohesion: 0.10
Nodes (19): BannedPage(), PageProps, CheckoutClientProps, SaldoCardProps, formatDate(), StateCardProps, SubscriptionPanelProps, SubscriptionStateCard() (+11 more)

### Community 29 - "dependencies"
Cohesion: 0.06
Nodes (32): dependencies, @base-ui/react, class-variance-authority, clsx, @fontsource/ubuntu, @fontsource-variable/teko, howler, lucide-react (+24 more)

### Community 30 - "xpProgress"
Cohesion: 0.13
Nodes (24): FriendStatus, getPublicMiniProfile(), PublicHeroRef, STATUSES, MePage(), PageProps, cachedToData(), CareerSyncResult (+16 more)

### Community 31 - "page.tsx"
Cohesion: 0.09
Nodes (26): buildCoachInfo(), CoachRow, FALLBACK_COACH, loadPackagesWithCoaches(), PackageRow, PackageWithCoach, PacotesPage(), ProfileRow (+18 more)

### Community 32 - "identities.ts"
Cohesion: 0.13
Nodes (24): fetchLobbyMessages(), LobbyChatMessage, SendSchema, fetchPartyMessages(), fetchActivePT(), RankingPage(), TeamDetailPage(), LivePROStrip() (+16 more)

### Community 33 - "route.ts"
Cohesion: 0.16
Nodes (25): handleAuthorizedPaymentEvent(), handlePaymentEvent(), handlePreapprovalEvent(), POST(), PurchaseRow, sendPurchaseConfirmationSafely(), sendSubscriptionCreatedSafely(), sendSubscriptionRenewalSafely() (+17 more)

### Community 34 - "lobby-room.tsx"
Cohesion: 0.16
Nodes (20): LobbyRoomData, joinTeam(), leaveLobby(), Props, SlotMove, GAME_MODE_TRANS_KEYS, LobbyData, PlayerSlot (+12 more)

### Community 35 - "requireAdmin"
Cohesion: 0.24
Nodes (20): adminCloseLobby(), adminRemoveFromQueue(), adminToggleCoachFila(), fetchAdminProsData(), ActionResult, AdminGate, DotaMatchIdSchema, logAdmin() (+12 more)

### Community 36 - "match-detail.tsx"
Cohesion: 0.14
Nodes (20): MatchDetailData, Tab, TABS, TeamHeader(), DraftPanel(), ICON, ObjectivesPanel(), teamColor() (+12 more)

### Community 37 - "confirm.tsx"
Cohesion: 0.09
Nodes (22): ATTR_COLORS, ATTR_LABEL_KEYS, HeroPicker(), Mode, PrimaryAttr, Props, ConfirmContext, ConfirmContextValue (+14 more)

### Community 38 - "match-stats.ts"
Cohesion: 0.17
Nodes (25): assembleMatch(), teamSlot(), unitMap(), parseNeutral(), parseSkills(), colorFor(), BENCH_META, buildAdvantage() (+17 more)

### Community 39 - "actions.ts"
Cohesion: 0.13
Nodes (21): getSeasonPositions(), EMPTY_DEMAND, enterQueue(), getMatchSearchingCount(), getQueueSearchers(), getRoleDemand(), leaveQueue(), MATCH_SIZE (+13 more)

### Community 40 - "subscription.ts"
Cohesion: 0.14
Nodes (21): cancelSubscription(), createSubscription(), reactivateSubscription(), sendCancelledEmailSafely(), SupabaseSrv, PlanosPage(), PlansViewProps, SubscribeButton() (+13 more)

### Community 41 - "profile-page.tsx"
Cohesion: 0.12
Nodes (22): HeroFace(), HeroFaceProps, SIZE_PX, CareerIdentityInline(), CareerIdentityInlineProps, CareerLinkSteamCta(), ResolvedHero, resolveTopHeroes() (+14 more)

### Community 42 - "maps-panel.tsx"
Cohesion: 0.33
Nodes (3): MapsPanel(), VisionPanel(), VisionMap()

### Community 43 - "page.tsx"
Cohesion: 0.12
Nodes (18): mmss(), tick(), MatchPasswordCard(), MatchPlayer, RawPlayer, ROLE_META, ROLE_ORDER, getLiveMatchStats() (+10 more)

### Community 44 - "spike.js"
Cohesion: 0.11
Nodes (21): anunciarEntrada(), client, {
  CMsgInviteToLobby,
  CMsgSOCacheSubscribed,
  CMsgSOMultipleObjects,
  CSODOTALobby,
  CSODOTAGameAccountClient,
}, descartarLobby(), dota2, { Dota2User }, enviarChatLobby(), FRASES_DOUTRINA (+13 more)

### Community 45 - "match-build.ts"
Cohesion: 0.16
Nodes (21): ItemSlot(), ItemIcon(), parseBoots(), parseImportant(), RawPurchase, readPurchaseLog(), toPurchase(), ABILITIES (+13 more)

### Community 46 - "client.ts"
Cohesion: 0.20
Nodes (21): createPreapproval(), isTestMode(), CreatePixPaymentInput, createPixPaymentInputSchema, CreatePreapprovalInput, createPreapprovalInputSchema, MP_WEBHOOK_EVENT_TYPES, MpAuthorizedPaymentDetail (+13 more)

### Community 47 - "actions.ts"
Cohesion: 0.19
Nodes (20): loadEnv(), main(), ActionResult, cancelPT(), confirmPTRealized(), enrichMatchFromOpenDota(), removeFromQueue(), reprocessMatchOpenDota() (+12 more)

### Community 48 - "useToast"
Cohesion: 0.17
Nodes (16): AvatarUrlSchema, clearCustomAvatar(), saveCustomAvatarUrl(), Props, ACCEPTED_TYPES, AvatarUpload(), Props, AvatarEditor() (+8 more)

### Community 49 - "match-coordination.ts"
Cohesion: 0.15
Nodes (21): ActiveMatchSession, callBotApi(), finishCoordinatedMatch(), FinishMatchInput, FinishMatchResult, FinishMatchSchema, getActiveMatchSession(), previewMatchValidation() (+13 more)

### Community 50 - "actions.ts"
Cohesion: 0.17
Nodes (18): cancelTournament(), CreateSchema, createTournament(), generateBracket(), openRegistration(), ReportSchema, reportTournamentMatch(), revalidateTournamentRoutes() (+10 more)

### Community 51 - "criar-lobby-form.tsx"
Cohesion: 0.12
Nodes (17): cancelLobby(), createLobby(), CreateLobbyResult, inputSchema, updateLobbySettings(), updateSchema, FormProps, BotApiResult (+9 more)

### Community 52 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 53 - "dashboard-grid.tsx"
Cohesion: 0.14
Nodes (19): updateDashboardLayout(), BREAKPOINTS, buildLayouts(), COLS, DashboardGrid(), Props, ResponsiveGridLayout, stripLayout() (+11 more)

### Community 54 - "page.tsx"
Cohesion: 0.12
Nodes (15): getProRevenue(), AdminUserDetailPage(), behaviorLabel(), generateMetadata(), getNowMs(), honorScoreToRank(), Translator, AdjustPermissionsModal() (+7 more)

### Community 55 - "play-menu.tsx"
Cohesion: 0.17
Nodes (13): AdminLobbiesLive(), LobbyRoom(), useLobbyRealtime(), getQueueStatus(), mmss(), Modalidade, onMatchRoute(), PlayMenu() (+5 more)

### Community 56 - "cockpit-action-panel.tsx"
Cohesion: 0.14
Nodes (17): togglePROFila(), ActivePTPanel(), CockpitActionPanel(), formatElapsed(), NextPTPanel(), PanelProps, CockpitActivePT, CockpitQueueEntry (+9 more)

### Community 57 - "match-feed-cards.tsx"
Cohesion: 0.15
Nodes (13): PartidasPage(), DATE_LOCALE, HistoryMatchCard(), LiveMatchCard(), MvpBadge(), Props, getLiveMatches(), getRecentMatches() (+5 more)

### Community 58 - "compilerOptions"
Cohesion: 0.09
Nodes (21): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+13 more)

### Community 59 - "package.json"
Cohesion: 0.10
Nodes (20): dependencies, discord.js, dotenv, express, zod, description, devDependencies, tsx (+12 more)

### Community 60 - "top-bar.tsx"
Cohesion: 0.14
Nodes (13): CommunityCounters, getCommunityCounters(), updateLastSeen(), getOnlinePlayers(), OnlinePlayer, CommunityCountersBar(), MobileNav(), CondutaBadge() (+5 more)

### Community 61 - "env.ts"
Cohesion: 0.24
Nodes (18): handleCheckoutCompleted(), handleInvoiceFailed(), handleInvoicePaid(), handleSubscriptionDeleted(), handleSubscriptionUpdated(), POST(), Service, subIdFromInvoice() (+10 more)

### Community 62 - "toast.tsx"
Cohesion: 0.10
Nodes (17): registerTeamForTournament(), AvailableTeam, TournamentRegisterButton(), formatExpiresAt(), QRCodeDisplay(), QRCodeDisplayProps, BORDER_BY_TYPE, ICON_BY_TYPE (+9 more)

### Community 63 - "page.tsx"
Cohesion: 0.13
Nodes (10): AdminFichasPage(), AdminTorneiosPage(), metadata, STATUS_LABEL, STATUS_VARIANT, TorneiosPage(), Badge, BadgeProps (+2 more)

### Community 64 - "dependencies"
Cohesion: 0.11
Nodes (18): dependencies, dota2-user, dotenv, protobufjs, steam-session, steam-totp, steam-user, @supabase/supabase-js (+10 more)

### Community 65 - "cosmetics.ts"
Cohesion: 0.16
Nodes (15): ColecaoPage(), CollectionView(), SLOT_ORDER, CosmeticCard(), Cosmetic, CosmeticRarity, CosmeticSlot, CollectionItem (+7 more)

### Community 66 - "actions.ts"
Cohesion: 0.16
Nodes (14): safeNext(), signInWithDiscord(), signInWithDiscordTo(), signOut(), startDiscordOAuth(), GET(), HubCenter(), HubCenterProps (+6 more)

### Community 67 - "navigation.tsx"
Cohesion: 0.13
Nodes (9): LADDER, richTags, TLDR, Props, QueueStatusPill(), Props, TabTitleUpdater(), Link (+1 more)

### Community 68 - "ready-check-overlay.tsx"
Cohesion: 0.18
Nodes (14): acceptMatchProposal(), declineMatchProposal(), getMatchRouteId(), getMyProposal(), mapMembers(), MatchProposal, ProposalMember, RawMember (+6 more)

### Community 69 - "lobbies-content.tsx"
Cohesion: 0.15
Nodes (10): CriarLobbyForm(), CreateLobbyModal(), Props, LobbyListItem, GAME_MODE_KEYS, LobbiesContent(), LobbiesContentProps, Props (+2 more)

### Community 70 - "novidades-view.tsx"
Cohesion: 0.18
Nodes (14): generateMetadata(), NovidadesPage(), MiniMarkdown(), renderInline(), CATEGORY_META, FilterChip(), monthKey(), NovidadesView() (+6 more)

### Community 71 - "actions.ts"
Cohesion: 0.16
Nodes (13): joinCoachQueue(), JoinQueueResult, JoinRpcResponse, leaveCoachQueue(), LeaveRpcResponse, JoinQueueModal(), Props, Props (+5 more)

### Community 72 - "actions.ts"
Cohesion: 0.22
Nodes (13): activateSeason(), createSeason(), CreateSeasonSchema, deactivateSeason(), endSeason(), revalidateSeasonRoutes(), SeasonIdSchema, AdminTemporadasPage() (+5 more)

### Community 73 - "heroes.ts"
Cohesion: 0.18
Nodes (13): HeroStrip(), PlayerChip(), fmtK(), MatchRow, TabHistorico(), GAME_MODE_PT, gameModeName(), BY_ID (+5 more)

### Community 74 - "compilerOptions"
Cohesion: 0.12
Nodes (15): compilerOptions, declaration, esModuleInterop, module, moduleResolution, noImplicitAny, outDir, resolveJsonModule (+7 more)

### Community 75 - "cosmetics.ts"
Cohesion: 0.21
Nodes (14): ActionResult, equipCosmetic(), getProfileThemeOptions(), IdSchema, ProfileThemeOption, SlotSchema, unequipSlot(), BackgroundPicker() (+6 more)

### Community 76 - "mini-profile-panel.tsx"
Cohesion: 0.17
Nodes (8): MiniProfilePanel(), Props, Props, toggleSidebar(), BadgeAsset, FrameAsset, RingAsset, EquippedCosmetics

### Community 77 - "right-sidebar.tsx"
Cohesion: 0.17
Nodes (8): Props, RankingCard(), sidebarRankMedal(), HistoryMatch, SidebarData, SidebarRankRow, SidebarSeason, WallEntry

### Community 78 - "heatmap-panel.tsx"
Cohesion: 0.47
Nodes (4): colorFor(), drawHeatmap(), HeatmapPanel(), HeatCell

### Community 79 - "xp-avatar-ring.tsx"
Cohesion: 0.22
Nodes (11): CountUp(), Props, ProgressTipGlow(), Props, EFFECT_COLOR, XpAvatarRing(), setGlobalDensity(), _subscribers (+3 more)

### Community 80 - "devDependencies"
Cohesion: 0.13
Nodes (15): devDependencies, eslint, eslint-config-next, @eslint/eslintrc, pg, postcss, tailwindcss, @tailwindcss/postcss (+7 more)

### Community 81 - "graphs-panel.tsx"
Cohesion: 0.18
Nodes (9): ChartLine, fmtAxis(), MultiLineChart(), SignedAreaChart(), SignedAreaChartProps, GraphsPanel(), toLines(), DIRE_COLORS (+1 more)

### Community 82 - "queue-panel.tsx"
Cohesion: 0.19
Nodes (13): formatTimer(), getStatusLabel(), QueuePanel(), QueuePanelProps, QueueParticipant, QueueStatus, TIMER_SOUND_MILESTONES, ACTIVE_STATUSES (+5 more)

### Community 83 - "profile-stats-card.tsx"
Cohesion: 0.23
Nodes (11): angle(), HexSeries, PerformanceHexagon(), point(), poly(), fmt(), ProfileStatsCard(), toValues() (+3 more)

### Community 84 - "profile.ts"
Cohesion: 0.20
Nodes (13): FavoriteHeroesSchema, HeroPortraitSchema, OfficialNickSchema, resetDashboardLayout(), setOfficialNick(), SOCIAL_KEYS, SocialLinksSchema, StatusSchema (+5 more)

### Community 85 - "cosmetics.ts"
Cohesion: 0.31
Nodes (11): Preview(), asBadgeAsset(), asFrameAsset(), asRingAsset(), asSmokeAsset(), CosmeticSource, profileThemeCss(), RARITY_META (+3 more)

### Community 86 - "career.ts"
Cohesion: 0.20
Nodes (13): CareerTotals, fetchCareerStats(), fetchJson(), fetchStratzCareer(), pickTopHeroes(), RawHeroEntry, RawPlayerResponse, RawTotalEntry (+5 more)

### Community 87 - "admin-pros-data.ts"
Cohesion: 0.24
Nodes (12): assemble(), buildHistory(), buildPending(), CoachRowDB, countBy(), EntryRowDB, fetchProfilesMap(), getAdminProsData() (+4 more)

### Community 88 - "stats-actions.ts"
Cohesion: 0.24
Nodes (10): BackfillStatsButton(), backfillAllPlayerStats(), BackfillResult, StatsInsert, steam64To32(), fetchFromOpenDota(), fetchFromStratz(), fetchPlayerStats() (+2 more)

### Community 89 - "bottom-bar.tsx"
Cohesion: 0.23
Nodes (10): QueueGameMode, QueueRole, CtaProps, DashboardBottomBar(), Props, Props, SmokeAsset, DEFAULT (+2 more)

### Community 90 - "queue-searchers-panel.tsx"
Cohesion: 0.22
Nodes (10): QueueSearcher, computeComposition(), Props, QueueSearchersPanel(), ROLE_IDS, SearcherRow(), GAME_MODES, MODE_LABEL (+2 more)

### Community 91 - "deploy"
Cohesion: 0.17
Nodes (11): build, builder, dockerfilePath, deploy, healthcheckPath, healthcheckTimeout, numReplicas, restartPolicyMaxRetries (+3 more)

### Community 92 - "setup-channels.ts"
Cohesion: 0.18
Nodes (8): Access, Ch, client, DOUTRINA_CONTENT, ensureChannel(), overwritesFor(), STRUCTURE, WELCOME_CONTENT

### Community 93 - "steam.ts"
Cohesion: 0.26
Nodes (9): GET(), SeedResult, seedSeasonMmrForUser(), fetchSteamPersona(), SteamPlayerSummary, SteamProfile, SummariesResponse, validateAndFetchSteam() (+1 more)

### Community 94 - "page.tsx"
Cohesion: 0.18
Nodes (6): generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), generateMetadata(), languageAlternates()

### Community 96 - "page.tsx"
Cohesion: 0.16
Nodes (16): HistoricoPartidaPage(), CopyMatchId(), ReprocessMatchButton(), Identity, MatchPlayerRow, parsePlayerHeatmap(), parseBuilding(), parseDraft() (+8 more)

### Community 97 - "times-content.tsx"
Cohesion: 0.23
Nodes (9): createTeam(), CreateTeamModal(), Invite, slugify(), TeamCard(), UserTeam, MatchIdSearch(), AvatarPortraitEdit() (+1 more)

### Community 98 - "match-scoreboard.tsx"
Cohesion: 0.20
Nodes (7): fmtK(), MatchScoreboard(), NetWorthCell(), POSITION_LABEL, ScoreboardPlayer, TeamTable(), UserHoverCard()

### Community 99 - "plans-view.tsx"
Cohesion: 0.24
Nodes (10): PLAN_STYLE, PLAN_TO_TIER, PlanCard(), PlanCta(), PlansView(), Translator, formatPrice(), Plan (+2 more)

### Community 100 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, db:gen-types, dev, gen:abilities, gen:heroes, gen:items, lint (+3 more)

### Community 101 - "setup-discord-roles.mjs"
Cohesion: 0.24
Nodes (9): APP_ENV, BOT_ENV, __dirname, discord(), main(), parseEnv(), ROLES_SPEC, ROOT (+1 more)

### Community 102 - "lobby-invites.ts"
Cohesion: 0.31
Nodes (9): acceptLobbyInvite(), declineLobbyInvite(), fetchMyLobbyInvites(), InviteResult, UUIDSchema, LobbyInviteListener(), Props, setPlayMenuState() (+1 more)

### Community 103 - "page.tsx"
Cohesion: 0.24
Nodes (6): CloseLobbyModal(), AdminLobbiesPage(), formatAge(), getNowMs(), metadata, TeamCounts

### Community 104 - "route.ts"
Cohesion: 0.44
Nodes (9): POST(), safeEqualSecret(), finalizePendingMmr(), fetchOpenDotaMatch(), botConfig(), botPost(), ensureTeamVoiceRooms(), teamDiscordIds() (+1 more)

### Community 105 - "actions.ts"
Cohesion: 0.24
Nodes (10): ActivePackage, checkoutInputSchema, CheckoutResult, createCheckout(), findActivePackage(), insertPendingPurchase(), PurchaseInsertResult, SupabaseSrv (+2 more)

### Community 106 - "page.tsx"
Cohesion: 0.22
Nodes (7): FORMAT_KEYS, PageProps, RegisteredTeamEntry, ROUND_KEYS, roundNameKey(), STATUS_VARIANT, TournamentDetailPage()

### Community 107 - "AmbientLayer.tsx"
Cohesion: 0.24
Nodes (9): AmbientDensity, AmbientLayer(), AmbientLayerProps, AmbientParticlesInner(), AmbientPreset, getCountMultiplier(), dustPreset, fogPreset (+1 more)

### Community 108 - "clean_vtt.py"
Cohesion: 0.31
Nodes (9): Path, clean_vtt(), get_video_groups(), main(), pick_best(), Limpa arquivos VTT do YouTube em texto puro pra leitura.  Estratégia: - Para, Extrai apenas texto limpo de um VTT, sem timestamps/tags/duplicações., Agrupa VTTs por vídeo, mapeando idioma → arquivo. (+1 more)

### Community 109 - "apply-migration-008.mjs"
Cohesion: 0.22
Nodes (9): connectWithFallback(), env, envFile, envPath, main(), migration008, migration010, poolerHosts (+1 more)

### Community 110 - "page.tsx"
Cohesion: 0.22
Nodes (6): ACTIVE_STATUSES, AdminPartidasPage(), fmt(), metadata, RawLobbyPlayer, ROLE_POS

### Community 111 - "room-actions.tsx"
Cohesion: 0.27
Nodes (6): ActionResult, cancelLobby(), startMatch(), RoomActions(), RoomActionsProps, StartMatchButton()

### Community 112 - "tab-conduta.tsx"
Cohesion: 0.33
Nodes (6): CoachingReviewsList(), behaviorStatusMeta(), Props, TabConduta(), CoachingReview, ServerClient

### Community 113 - "discord-sync.ts"
Cohesion: 0.22
Nodes (9): buildEmbeds(), CATEGORY_STYLE, DEFAULT_STYLE, Row, Selector, Style, syncChangelogToDiscord(), Terminal (+1 more)

### Community 114 - "process-honor-medals.py"
Cohesion: 0.31
Nodes (8): build(), cell(), from_hsv(), glow(), material(), Recolore o metal preservando luz. `only_warm`: mexe só nos pixels dourados     (, Aura atrás da medalha, composta NO MESMO canvas (sem resize — a medalha     mant, to_hsv()

### Community 115 - "team-detail-actions.tsx"
Cohesion: 0.33
Nodes (7): deleteTeam(), kickMember(), leaveTeam(), TeamPlayerSearchResult, Member, TeamDetailActions(), TeamInvitePanel()

### Community 116 - "merge-i18n.mjs"
Cohesion: 0.29
Nodes (6): en, incoming, isLeaf(), pick(), pt, root

### Community 117 - "seo.ts"
Cohesion: 0.39
Nodes (4): PUBLIC_ROUTES, sitemap(), localizedUrls(), SITE_URL

### Community 118 - "opendota.ts"
Cohesion: 0.25
Nodes (6): fetchOpenDotaWithRetry(), NormalizedPlayer, OpenDotaError, OpenDotaMatch, OpenDotaPlayer, ValidateMatchResult

### Community 119 - "hooks.ts"
Cohesion: 0.25
Nodes (3): CoachPresence, CommunityStats, TODO: substituir retornos mock por subscriptions reais nos comentários marcados

### Community 120 - "apply-migration-005.mjs"
Cohesion: 0.33
Nodes (6): connectWithFallback(), env, envFile, main(), migrationSql, poolerHosts

### Community 121 - "gen-heroes.ts"
Cohesion: 0.43
Nodes (6): buildUrls(), fetchHeroStats(), HeroOutput, main(), mapAttr(), OpenDotaHeroStats

### Community 122 - "actions.ts"
Cohesion: 0.33
Nodes (4): AdjustInput, AdjustResult, adjustUserFichas(), Props

### Community 123 - "dota-heroes.ts"
Cohesion: 0.38
Nodes (5): DOTA_HEROES, DotaHero, getHeroById(), HERO_BY_ID, searchHeroes()

### Community 124 - "vercel.json"
Cohesion: 0.29
Nodes (6): buildCommand, framework, headers, installCommand, regions, $schema

### Community 125 - "gen-items.ts"
Cohesion: 0.40
Nodes (5): fetchItems(), ItemCatalog, ItemsConstants, main(), OpenDotaItem

### Community 126 - "coaching-review-panel.tsx"
Cohesion: 0.53
Nodes (4): ReviewResult, ReviewSchema, submitCoachingReview(), CoachingReviewPanel()

### Community 127 - "get-refresh-token.js"
Cohesion: 0.40
Nodes (3): { LoginSession, EAuthTokenPlatformType }, readline, rl

### Community 128 - "package.json"
Cohesion: 0.40
Nodes (4): name, packageManager, private, version

### Community 129 - "combine-leak.mjs"
Cohesion: 0.50
Nodes (4): deepMerge(), files, isLeaf(), out

### Community 130 - "combine-quiz.mjs"
Cohesion: 0.40
Nodes (4): chapter, files, q, root

### Community 131 - "extract-incoming.mjs"
Cohesion: 0.40
Nodes (4): arr, m, obj, text

### Community 132 - "gen-abilities.ts"
Cohesion: 0.50
Nodes (4): AbilityCatalog, AbilityMeta, fetchJson(), main()

### Community 133 - "stripe-setup.ts"
Cohesion: 0.40
Nodes (3): PRICES, PRODUCTS, stripe

### Community 134 - "finalize-actions.ts"
Cohesion: 0.50
Nodes (3): finalizeLobbyMatch(), FinalizeResult, FinalizeMatchButton()

## Knowledge Gaps
- **804 isolated node(s):** `path`, `readline`, `protobuf`, `SteamUser`, `SteamTotp` (+799 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `createClient` connect `createClient` to `mmr.ts`, `RitualDoutrina.tsx`, `page.tsx`, `server.ts`, `honor-rank-medal.tsx`, `finalize-actions.ts`, `chat-bar.tsx`, `user-hover-card.tsx`, `cn`, `user-modals.tsx`, `createServiceClient`, `levels.ts`, `page.tsx`, `actions.ts`, `actions.ts`, `card.tsx`, `xpProgress`, `page.tsx`, `identities.ts`, `lobby-room.tsx`, `requireAdmin`, `actions.ts`, `subscription.ts`, `page.tsx`, `actions.ts`, `useToast`, `match-coordination.ts`, `criar-lobby-form.tsx`, `dashboard-grid.tsx`, `page.tsx`, `play-menu.tsx`, `cockpit-action-panel.tsx`, `match-feed-cards.tsx`, `top-bar.tsx`, `toast.tsx`, `page.tsx`, `cosmetics.ts`, `actions.ts`, `ready-check-overlay.tsx`, `novidades-view.tsx`, `actions.ts`, `actions.ts`, `heroes.ts`, `cosmetics.ts`, `right-sidebar.tsx`, `profile.ts`, `admin-pros-data.ts`, `stats-actions.ts`, `steam.ts`, `page.tsx`, `times-content.tsx`, `lobby-invites.ts`, `page.tsx`, `actions.ts`, `page.tsx`, `page.tsx`, `room-actions.tsx`, `tab-conduta.tsx`, `team-detail-actions.tsx`, `actions.ts`, `coaching-review-panel.tsx`?**
  _High betweenness centrality (0.193) - this node is a cross-community bridge._
- **Why does `cn()` connect `cn` to `RitualDoutrina.tsx`, `useMotionSafeBool`, `page.tsx`, `pro-card.tsx`, `honor-rank-medal.tsx`, `button.tsx`, `page.tsx`, `createServiceClient`, `levels.ts`, `page.tsx`, `admin-coach-detail.tsx`, `actions.ts`, `card.tsx`, `confirm.tsx`, `actions.ts`, `profile-page.tsx`, `match-coordination.ts`, `cockpit-action-panel.tsx`, `top-bar.tsx`, `toast.tsx`, `page.tsx`, `cosmetics.ts`, `actions.ts`, `ready-check-overlay.tsx`, `novidades-view.tsx`, `xp-avatar-ring.tsx`, `queue-panel.tsx`, `cosmetics.ts`, `plans-view.tsx`?**
  _High betweenness centrality (0.059) - this node is a cross-community bridge._
- **Why does `dependencies` connect `dependencies` to `package.json`, `cn`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `Limpa arquivos VTT do YouTube em texto puro pra leitura.  Estratégia: - Para`, `Extrai apenas texto limpo de um VTT, sem timestamps/tags/duplicações.`, `Agrupa VTTs por vídeo, mapeando idioma → arquivo.` to the rest of the system?**
  _812 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mmr.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.059466848940533154 - nodes in this community are weakly interconnected._
- **Should `RitualDoutrina.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.05985915492957746 - nodes in this community are weakly interconnected._
- **Should `useMotionSafeBool` be split into smaller, more focused modules?**
  _Cohesion score 0.051759834368530024 - nodes in this community are weakly interconnected._