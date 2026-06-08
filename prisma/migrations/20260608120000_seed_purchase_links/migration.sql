-- Seed purchase links for all seeded games
-- Disco Elysium omitted: delisted from all storefronts in 2023 (ZA/UM IP dispute)

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/292030/"},
  {"store":"GOG","url":"https://www.gog.com/en/game/the_witcher_3_wild_hunt"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP4497-CUSA00527_00-THEWITCHER3GAME0"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/the-witcher-3-wild-hunt/BQ2X9XBD0N0B"},
  {"store":"Nintendo eShop","url":"https://www.nintendo.com/us/store/products/the-witcher-3-wild-hunt-complete-edition-switch/"}
]'::jsonb WHERE slug = 'the-witcher-3-wild-hunt';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/1245620/"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP0101-PPSA02520_00-ELDENRING0000000"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/elden-ring/9P3J6BZSXK7P"}
]'::jsonb WHERE slug = 'elden-ring';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/367520/"},
  {"store":"GOG","url":"https://www.gog.com/en/game/hollow_knight"},
  {"store":"Nintendo eShop","url":"https://www.nintendo.com/us/store/products/hollow-knight-switch/"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/hollow-knight/BWMM984L44WQ"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP3643-CUSA24697_00-HOLLOWKNIGHT00US"}
]'::jsonb WHERE slug = 'hollow-knight';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/289070/"},
  {"store":"Epic Games","url":"https://store.epicgames.com/en-US/p/sid-meiers-civilization-vi"},
  {"store":"GOG","url":"https://www.gog.com/en/game/sid_meiers_civilization_vi"}
]'::jsonb WHERE slug = 'civilization-vi';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/413150/"},
  {"store":"GOG","url":"https://www.gog.com/en/game/stardew_valley"},
  {"store":"Nintendo eShop","url":"https://www.nintendo.com/us/store/products/stardew-valley-switch/"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/stardew-valley/C3D571C2DDB5"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP2233-CUSA07713_00-STARDEWVALLEYPSX"}
]'::jsonb WHERE slug = 'stardew-valley';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/1145360/"},
  {"store":"Epic Games","url":"https://store.epicgames.com/en-US/p/hades"},
  {"store":"Nintendo eShop","url":"https://www.nintendo.com/us/store/products/hades-switch/"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/hades/9P8D5BXLS01B"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP2125-PPSA03868_00-HADESSIEA0000001"}
]'::jsonb WHERE slug = 'hades';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/1174180/"},
  {"store":"Rockstar Games","url":"https://www.rockstargames.com/reddeadredemption2/"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP1004-CUSA03041_00-REDDEAD2ULTIMATE"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/red-dead-redemption-2/BRGPCRBS6SP2"}
]'::jsonb WHERE slug = 'red-dead-redemption-2';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/1593500/"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP9000-CUSA07408_00-00000000GODOFWAR"}
]'::jsonb WHERE slug = 'god-of-war-2018';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/620/"}
]'::jsonb WHERE slug = 'portal-2';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/782330/"},
  {"store":"Epic Games","url":"https://store.epicgames.com/en-US/p/doom-eternal"},
  {"store":"GOG","url":"https://www.gog.com/en/game/doom_eternal"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP1001-CUSA11396_00-DOOMETERNAL00000"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/doom-eternal/9P2QJXFJ76LQ"},
  {"store":"Nintendo eShop","url":"https://www.nintendo.com/us/store/products/doom-eternal-switch/"}
]'::jsonb WHERE slug = 'doom-eternal';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/814380/"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP0101-CUSA13280_00-SEKIROGOTYE000EU"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/sekiro-shadows-die-twice-goty-edition/9N2RS3S98B3R"}
]'::jsonb WHERE slug = 'sekiro-shadows-die-twice';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/883710/"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP0102-CUSA12539_00-BH2REMAKE0000000"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/resident-evil-2/9NMBKQ6T8V16"}
]'::jsonb WHERE slug = 'resident-evil-2';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/504230/"},
  {"store":"Nintendo eShop","url":"https://www.nintendo.com/us/store/products/celeste-switch/"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/celeste/BWMGWPNCLGLZ"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP2120-CUSA11753_00-CELESTEFULLGAME0"}
]'::jsonb WHERE slug = 'celeste';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Steam","url":"https://store.steampowered.com/app/1551360/"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/forza-horizon-5/9NKX70BBCDRN"}
]'::jsonb WHERE slug = 'forza-horizon-5';

UPDATE "games" SET "purchaseLinks" = '[
  {"store":"Epic Games","url":"https://store.epicgames.com/en-US/p/rocket-league"},
  {"store":"PlayStation Store","url":"https://store.playstation.com/en-us/product/UP4354-CUSA01433_00-ROCKETLEAGUE0000"},
  {"store":"Xbox","url":"https://www.xbox.com/en-US/games/store/rocket-league/9P49KPCLDDP4"},
  {"store":"Nintendo eShop","url":"https://www.nintendo.com/us/store/products/rocket-league-switch/"}
]'::jsonb WHERE slug = 'rocket-league';
