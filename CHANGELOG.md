# [1.25.0](https://github.com/Carmentis/carmentis-desk/compare/v1.24.0...v1.25.0) (2026-06-24)


### Features

* add Mainnet support and improve network initialization ([b1ad5e4](https://github.com/Carmentis/carmentis-desk/commit/b1ad5e4daaa8debcc856e37f53f360bff610a295))
* integrate `walletStore` into `onchain` store and streamline key retrieval for token transfer ([6c5960f](https://github.com/Carmentis/carmentis-desk/commit/6c5960f225970044197eea27aa17a2b772d42cda))

# [1.24.0](https://github.com/Carmentis/carmentis-desk/compare/v1.23.3...v1.24.0) (2026-06-23)


### Features

* add signature scheme selection and key pair validation to wallet ([df89b91](https://github.com/Carmentis/carmentis-desk/commit/df89b91ec18818555dfd2380fba18658b26b4c59))

## [1.23.3](https://github.com/Carmentis/carmentis-desk/compare/v1.23.2...v1.23.3) (2026-06-23)


### Bug Fixes

* invalid dialog opening state used, blocking the deletion of organization ([98fb2af](https://github.com/Carmentis/carmentis-desk/commit/98fb2aff72c3849d62be764397ad3ae059fd234a))

## [1.23.2](https://github.com/Carmentis/carmentis-desk/compare/v1.23.1...v1.23.2) (2026-06-19)


### Bug Fixes

* update of the broken sdk ([342d4d2](https://github.com/Carmentis/carmentis-desk/commit/342d4d204e302adffdb72858357abbf90f0842d4))

## [1.23.1](https://github.com/Carmentis/carmentis-desk/compare/v1.23.0...v1.23.1) (2026-06-17)


### Bug Fixes

* make indexer endpoint configurable in `getAccountIdFromPublicKey` ([5f35d2c](https://github.com/Carmentis/carmentis-desk/commit/5f35d2caace2417dcb23262fd39d4f7883bfcfa6))

# [1.23.0](https://github.com/Carmentis/carmentis-desk/compare/v1.22.0...v1.23.0) (2026-06-17)


### Features

* add account proof, microblock proof, stats, and node status API integration ([64b8a57](https://github.com/Carmentis/carmentis-desk/commit/64b8a574281c0d409040ec822cc7ea4a8d579cdd))
* utilize `Hash` for account ID conversion in wallet and transaction queries ([ccaafd9](https://github.com/Carmentis/carmentis-desk/commit/ccaafd92ffb14036dd96806ea040ab4ed5bd917e))

# [1.22.0](https://github.com/Carmentis/carmentis-desk/compare/v1.21.0...v1.22.0) (2026-06-17)


### Features

* improve node handling and add indexer client integration ([a8d0782](https://github.com/Carmentis/carmentis-desk/commit/a8d0782361f023a964c61e4132c67c857dc72967))
* make `indexer` mandatory and improve node staking UI ([3c8a016](https://github.com/Carmentis/carmentis-desk/commit/3c8a0166b8eaf564e1fc0c74d8a250cfeac8f067))
* mark indexer endpoint as required in wallet connectivity UI ([a9d8ef8](https://github.com/Carmentis/carmentis-desk/commit/a9d8ef8b17609d474779ce57a6457b2ce571b9ff))

# [1.21.0](https://github.com/Carmentis/carmentis-desk/compare/v1.20.0...v1.21.0) (2026-06-17)


### Features

* add developer tools support and debug menu option ([2c5487e](https://github.com/Carmentis/carmentis-desk/commit/2c5487eae48bc6e149e8cf54dcd7b34639b46d1e))
* carmentis icon as app logo ([063f4da](https://github.com/Carmentis/carmentis-desk/commit/063f4daf01c0a5d62238d543d97edef59bd56ed5))
* hide navbar while session is locked ([afb2da0](https://github.com/Carmentis/carmentis-desk/commit/afb2da0ab33b38b8cb561ed1085edfd5f601399c))
* replace icons with Carmentis logo and add logo asset ([2a500ed](https://github.com/Carmentis/carmentis-desk/commit/2a500ed218fee91e46d9f1899a1af61aec3408bc))

# [1.20.0](https://github.com/Carmentis/carmentis-desk/compare/v1.19.0...v1.20.0) (2026-06-17)


### Features

* add connectivity tab to wallet details ([a53ba0b](https://github.com/Carmentis/carmentis-desk/commit/a53ba0b96d13b9a3b1870b8600d7ea0345e217bc))
* add editing and saving functionality to wallet connectivity settings ([3f44d4e](https://github.com/Carmentis/carmentis-desk/commit/3f44d4e810fdc3614d2cbd988902ab2c074887e3))
* extract organization state functionality into `OrganizationStateCard` component ([0e3f8cd](https://github.com/Carmentis/carmentis-desk/commit/0e3f8cd0495c6b88d65cd0a195a24e25c77314b0))
* extract publish organization logic into `OrganizationPublicationDialog` component ([7b4096e](https://github.com/Carmentis/carmentis-desk/commit/7b4096e64f9cfbb30e131a74cb575543a558ebb4))
* modularize app ledger explorer into dedicated components ([80d00b9](https://github.com/Carmentis/carmentis-desk/commit/80d00b9fcefb169abbeaf0445fced661e5188dd1))
* modularize application management into `OrganizationApplications` component ([80fadc7](https://github.com/Carmentis/carmentis-desk/commit/80fadc71e0b2a60065db34f86dfd671337f7fac9))
* modularize node management into dedicated components ([91043d6](https://github.com/Carmentis/carmentis-desk/commit/91043d62112d01d7b3517283d02c0f3a82ab9943))
* modularize organization dialogs for creation and deletion ([fa2942e](https://github.com/Carmentis/carmentis-desk/commit/fa2942e8577b6c38382b2f22d98805d4a28b9195))
* modularize organization nodes and custom data management ([ba66c62](https://github.com/Carmentis/carmentis-desk/commit/ba66c62711c011aace0ff5e28392af0ee11b7cab))
* replace organizations list with DataTable in WalletDetailOrganizationsCard ([d40a621](https://github.com/Carmentis/carmentis-desk/commit/d40a621d7a2539b045581e716e65bd3f0523e473))

# [1.19.0](https://github.com/Carmentis/carmentis-desk/compare/v1.18.0...v1.19.0) (2026-06-16)


### Features

* add `Transaction` class and enhance transaction history features ([32240d2](https://github.com/Carmentis/carmentis-desk/commit/32240d29e86042517ce8a692b12eca17e1546fbc))
* add `useClipboard` composable and refactor clipboard functionality ([d21bbb7](https://github.com/Carmentis/carmentis-desk/commit/d21bbb72d0138d1a88405974cfbccd4e81c6e765))
* add empty state message for application ledger participations card ([a8e244e](https://github.com/Carmentis/carmentis-desk/commit/a8e244eb0db6009dccafcf300ea1e29fede659a7))
* add escrowed balance display to wallet breakdown ([cf92098](https://github.com/Carmentis/carmentis-desk/commit/cf920980fc7186d863acd46fcca231442d3e96df))
* extract and modularize token transfer dialog ([e92e4d2](https://github.com/Carmentis/carmentis-desk/commit/e92e4d28ef82015b54c15e4b7d40f1537f5f0f93))
* improve transaction history UI and refetch behavior ([6586d88](https://github.com/Carmentis/carmentis-desk/commit/6586d889b5a9f2f31a534be0e38ddd5bf168fda5))
* modularize wallet keys card and refactor related logic ([c63809f](https://github.com/Carmentis/carmentis-desk/commit/c63809fbd30010a77f5b203ef3b723ffeee80293))
* modularize wallet organizations and participations into separate components ([9961c72](https://github.com/Carmentis/carmentis-desk/commit/9961c72f1c14034117594e750846c2bafa485a59))
* transactions history in dialog ([d17308f](https://github.com/Carmentis/carmentis-desk/commit/d17308fb45a3f43c6a853c3a6974a465bd6f1d6f))

# [1.18.0](https://github.com/Carmentis/carmentis-desk/compare/v1.17.1...v1.18.0) (2026-06-15)


### Features

* improve transaction history filtering and enhance refetch logic ([a031ef6](https://github.com/Carmentis/carmentis-desk/commit/a031ef6555313cf9222a37d3747fa9779ded91ab))
* reduce refetch interval and enhance query options for better real-time updates ([4500751](https://github.com/Carmentis/carmentis-desk/commit/4500751e42d18609ae2bf58487f4781ad261b5a4))

## [1.17.1](https://github.com/Carmentis/carmentis-desk/compare/v1.17.0...v1.17.1) (2026-06-15)


### Bug Fixes

* update @cmts-dev/carmentis-sdk-core to 1.2.24 ([cf2213a](https://github.com/Carmentis/carmentis-desk/commit/cf2213a88485110f04b3df36e47d431966395121))

# [1.17.0](https://github.com/Carmentis/carmentis-desk/compare/v1.16.0...v1.17.0) (2026-06-11)


### Features

* add network selection in CreateOrganization with support for testnet, devnet, and custom options ([c0bb8f2](https://github.com/Carmentis/carmentis-desk/commit/c0bb8f2f27da207ac2a48822006992cd189b8f8e))

# [1.16.0](https://github.com/Carmentis/carmentis-desk/compare/v1.15.0...v1.16.0) (2026-06-10)


### Bug Fixes

* ensure `Copy Account ID` button checks for non-empty account ID value ([d103bfe](https://github.com/Carmentis/carmentis-desk/commit/d103bfeae2c78bbfae96989d24bee52953f6a34a))


### Features

* add "Copy Account ID" button to WalletDetail for quick ID copying ([b8410a5](https://github.com/Carmentis/carmentis-desk/commit/b8410a5f39bc0fbda6b9c84f12db1a3afcd51292))
* add descriptions for operator detail sections (wallets, administrators, applications, API keys) ([ce6554c](https://github.com/Carmentis/carmentis-desk/commit/ce6554c3dce79bb969c6b6511184ae942c6342f6))

# [1.15.0](https://github.com/Carmentis/carmentis-desk/compare/v1.14.0...v1.15.0) (2026-06-03)


### Bug Fixes

* delay router installation until session initialization to avoid premature navigation callbacks ([a2a7588](https://github.com/Carmentis/carmentis-desk/commit/a2a7588b09e76592bb4ca2f77e8965954017a919))


### Features

* add Carmentis indexer client and TypeScript models ([5f20cdb](https://github.com/Carmentis/carmentis-desk/commit/5f20cdbb3e42f92be7432b024739ec026fad244b))
* add optional indexer field to organization creation ([2ab0a31](https://github.com/Carmentis/carmentis-desk/commit/2ab0a313cf2a1cbfea8c7d0c116f2f740f83bc41))
* enhance on-chain sync logic with indexer integration and cleanup ([8054b6f](https://github.com/Carmentis/carmentis-desk/commit/8054b6f83cc62edd9efb74cbb80c7c142736da2e))
* implement WalletDetailSync component to fetch and import new on-chain data ([e90d1c9](https://github.com/Carmentis/carmentis-desk/commit/e90d1c9b145332dfabf094334afbc61f51539eec))
* introduce session-based vault management and onboarding flow ([fe4c737](https://github.com/Carmentis/carmentis-desk/commit/fe4c737c1445f0b07349e500d3a6f11f28a72fc5))
* update permissions and dependencies for SQL execution support ([3b764f1](https://github.com/Carmentis/carmentis-desk/commit/3b764f12a93c282579889e0cfa6f3b28aba05eda))

# [1.14.0](https://github.com/Carmentis/carmentis-desk/compare/v1.13.1...v1.14.0) (2026-06-01)


### Features

* add custom JSON publishing and section listing for organizations ([f8a3d0c](https://github.com/Carmentis/carmentis-desk/commit/f8a3d0c630aff47d32e9ea9daca664520ebb0027))
* add data import/export functionality with UI integration ([3fd808f](https://github.com/Carmentis/carmentis-desk/commit/3fd808f60131385ec6ddedbb4a4570180c8b0521))
* add unsaved changes indicator and form validation for Organization Details ([4f92691](https://github.com/Carmentis/carmentis-desk/commit/4f92691e727592ad75c0450cb7868c794e53c1eb))
* enhance account query behavior and refetch logic ([3dbd8ff](https://github.com/Carmentis/carmentis-desk/commit/3dbd8ff58094a030b4fcc2ab9c46768891df9ae5))
* lock features for unpublished organizations and simplify permissions logic ([432f05d](https://github.com/Carmentis/carmentis-desk/commit/432f05d24607d9986076a72a7c3478e4d8f9bcf7))
* move custom JSON publishing to modal and enhance UI/UX ([2d9419b](https://github.com/Carmentis/carmentis-desk/commit/2d9419bd3db9fbeb2ae851baf935dbbd94f7e62c))
* restructure organization detail cards and add tabs for nodes and applications ([3d21a1e](https://github.com/Carmentis/carmentis-desk/commit/3d21a1e2d9cd92024786fbc922ad978dd93d5dbd))

## [1.13.1](https://github.com/Carmentis/carmentis-desk/compare/v1.13.0...v1.13.1) (2026-05-21)


### Bug Fixes

* credentials whose subject is not the expected wallet is rejected. ([35efac4](https://github.com/Carmentis/carmentis-desk/commit/35efac43fcd33e92db0645b456c488d69d15a25e))

# [1.13.0](https://github.com/Carmentis/carmentis-desk/compare/v1.12.0...v1.13.0) (2026-05-21)


### Features

* add support for SD-JWT credential presentation and DCQL query handling ([64fdcc2](https://github.com/Carmentis/carmentis-desk/commit/64fdcc2f4be758338cc923d225b91475717ff053))
* improve SD-JWT credential selection and claim presentation UI ([de858bf](https://github.com/Carmentis/carmentis-desk/commit/de858bf6955e92b91a621c1203f79c15a3541515))

# [1.12.0](https://github.com/Carmentis/carmentis-desk/compare/v1.11.0...v1.12.0) (2026-05-18)


### Features

* add delete functionality for app ledger records in `WalletAppLedgerExplorer` ([b709c73](https://github.com/Carmentis/carmentis-desk/commit/b709c7360721615e37dade6808aa865dcf7ada4e))
* enhance `WalletAppLedgerExplorer` with tabs and VB metadata ([a1da99b](https://github.com/Carmentis/carmentis-desk/commit/a1da99b8255f46d4e85bdaa1a6cadbc746e12df1))
* redesign VB overview layout and add actor/channel displays ([2e76fee](https://github.com/Carmentis/carmentis-desk/commit/2e76fee2ceb5aa7ab3ec180509170ea4c0a748bc))

# [1.11.0](https://github.com/Carmentis/carmentis-desk/compare/v1.10.0...v1.11.0) (2026-05-13)


### Bug Fixes

* update `WalletDetail` layout by replacing grid with flex for improved structure ([3f400ef](https://github.com/Carmentis/carmentis-desk/commit/3f400efb2981dad631a3ac763826b13eb32a6c4c))
* update transaction mapping to handle fees account alias ([9713537](https://github.com/Carmentis/carmentis-desk/commit/9713537e7ae1fb99ba5e3e9f8f0b5813fc91163a))


### Features

* add `AppBreadcrumb` component and integrate with `AppNavbar` for improved navigation ([34ed966](https://github.com/Carmentis/carmentis-desk/commit/34ed966ac82212e6710991757bd00bad8103f742))
* add `AppNavbar` component and integrate it across the app ([d2e73c7](https://github.com/Carmentis/carmentis-desk/commit/d2e73c765e07e894e5c35eb3cd3e3e6776d1f3e1))
* add `Help` page and streamline help-related navigation ([19fcdd8](https://github.com/Carmentis/carmentis-desk/commit/19fcdd851e415fe4e0192130e25777b27a44fb13))
* add `Settings` page with theme toggle, update functionality, and log viewer integrations ([7acdba9](https://github.com/Carmentis/carmentis-desk/commit/7acdba987276341e758e2c2f2d346f1cf92491f6))
* add export proof functionality and integrate `ExportProofButton` in ledger explorer ([e9e4934](https://github.com/Carmentis/carmentis-desk/commit/e9e4934c5f2a4015bef80c9e7a3edb5fb65440de))
* add JWK exporter utility and update SD-JWT components for key handling ([27d065a](https://github.com/Carmentis/carmentis-desk/commit/27d065a5499924c453a98398f1f3416c920164fd))
* deep links and integrated documentation ([10a749c](https://github.com/Carmentis/carmentis-desk/commit/10a749cd5633107da505ed44cc4a01e6efd94cd8))

# [1.10.0](https://github.com/Carmentis/carmentis-desk/compare/v1.9.0...v1.10.0) (2026-04-02)


### Bug Fixes

* add [@ts-ignore](https://github.com/ts-ignore) for accessing private `encoded` property in SD-JWT parsing ([c7c1cd5](https://github.com/Carmentis/carmentis-desk/commit/c7c1cd542b4aaaff2d2b81c074b1f5e2337e6f1d))


### Features

* add `CredentialCardSdJwt` component and SD-JWT schema handling ([59ced04](https://github.com/Carmentis/carmentis-desk/commit/59ced04ae02e56501b58379692dac05a7b0ac939))
* add `CredentialCardSdJwtVc` for managing SD-JWT-VC credentials ([7fe3a5e](https://github.com/Carmentis/carmentis-desk/commit/7fe3a5e435a4ed6ad98e8fbb02c3975c2a49770a))
* add `SdJwtPresentationDialog` for SD-JWT presentation and claim management ([3f7e4f5](https://github.com/Carmentis/carmentis-desk/commit/3f7e4f553ee7e11d9e152bda166736d226e96356))
* add CredentialCard components with browse and delete functionality ([43c6586](https://github.com/Carmentis/carmentis-desk/commit/43c65866239bcb670a7959d048dfc1db5b9d800c))
* add Credentials management with UI and API integration ([23cf4d7](https://github.com/Carmentis/carmentis-desk/commit/23cf4d7512f07477a2e099d41f40fa8686584a0e))
* add SD-JWT token parsing and integration with credential management UI ([b28bca5](https://github.com/Carmentis/carmentis-desk/commit/b28bca56802d90c182a89e72cd1946cdf76d9298))
* display SD-JWT subject in `CredentialCardSdJwt` and update schema ([0f4e255](https://github.com/Carmentis/carmentis-desk/commit/0f4e255a33ecd4ee392ebde47dfd6934a703ea18))
* enhance credential cards with expandable fields and improved UI layout ([1a83632](https://github.com/Carmentis/carmentis-desk/commit/1a83632a146aaff8cf465c99469e94a56eeed537))
* integrate SD-JWT library and add `generateSdJwt` function in CredentialCard ([6d790b4](https://github.com/Carmentis/carmentis-desk/commit/6d790b4464edb086eec6a53f4bf16cf692e15dec))

# [1.9.0](https://github.com/Carmentis/carmentis-desk/compare/v1.8.0...v1.9.0) (2026-03-26)


### Features

* integrate JSON-RPC support for wallet requests and handle new request methods ([a8064dc](https://github.com/Carmentis/carmentis-desk/commit/a8064dca3429a1e3aa6dce4c1bb9ca68a9f2e51c))

# [1.8.0](https://github.com/Carmentis/carmentis-desk/compare/v1.7.0...v1.8.0) (2026-03-24)


### Bug Fixes

* building errors ([c3d2df5](https://github.com/Carmentis/carmentis-desk/commit/c3d2df58029367b33ee5e6b749b107d12e7af2f4))


### Features

* add app ledger participation storage and enhance WalletRequest approval flow ([49e9fec](https://github.com/Carmentis/carmentis-desk/commit/49e9fecc2d487cd10530f11b750e76618f735697))
* add application ledger exploration and participation overview in WalletDetail ([d5e76e8](https://github.com/Carmentis/carmentis-desk/commit/d5e76e8b4bc73cf24ff8b51b039f08b3f48aee36))
* add coding standards documentation for Vue 3 with PrimeVue, VueUse, and Pinia ([79b18da](https://github.com/Carmentis/carmentis-desk/commit/79b18dae38d7a41e732be86deebafc8ac00c63eb))
* add HelpDialog component and integrate it into Home menu ([04867f0](https://github.com/Carmentis/carmentis-desk/commit/04867f0c50dee50801a4b373d987d30e6540cf64))
* add JsonViewer and VirtualBlockchainRecordNavigator components ([9b03cff](https://github.com/Carmentis/carmentis-desk/commit/9b03cff3c6c40d7d347f4e810ed480cdac781ff9))
* add responsive sidebar with mobile toggle and navigation handling ([78142d9](https://github.com/Carmentis/carmentis-desk/commit/78142d9fe9523d72dba00f1f302c052333be34fa))
* add serverUrl and anchorRequestId to WalletRequestEventApproval, log incoming messages in WalletRequest ([f33fa09](https://github.com/Carmentis/carmentis-desk/commit/f33fa09da04df85a27859d7bda56cf2f041e9370))
* add theme management composable and integrate with Home component ([ca6dad2](https://github.com/Carmentis/carmentis-desk/commit/ca6dad2d60ae89175635fd45d141a7564441a0af))
* add wallet collapse/expand functionality in WalletSidebar ([dfdb054](https://github.com/Carmentis/carmentis-desk/commit/dfdb0548bb5768eb8ac1d8e25e66836fc1e0d8d0))
* add wallet selection Dropdown and enhance WalletRequest approval flow ([66162fa](https://github.com/Carmentis/carmentis-desk/commit/66162fa8c1158dcd00607294aea2ec32e2b9db30))
* display application details in WalletRequestEventApproval ([dcf31c7](https://github.com/Carmentis/carmentis-desk/commit/dcf31c7439ea158296c4a31d30835e0a35e0d1fd))
* implement WalletRequest flow and deep linking support ([ec25874](https://github.com/Carmentis/carmentis-desk/commit/ec25874cb5e3f11dcdb1c6881a304980b945a07c))
* introduce Proof Checker module with JSON proof upload, verification, and visualization ([8593342](https://github.com/Carmentis/carmentis-desk/commit/8593342ec5ef347cc478e239955c9c8abdef3fa9))
* redesign WalletRequest event approval UI with loading, error, and detail states ([c845232](https://github.com/Carmentis/carmentis-desk/commit/c84523282fd106c557d37292d874aedc9d2d0a54))

# [1.7.0](https://github.com/Carmentis/carmentis-desk/compare/v1.6.1...v1.7.0) (2026-03-05)


### Features

* add validator status indicator to NodeDetail component ([23cb735](https://github.com/Carmentis/carmentis-desk/commit/23cb73552b70f1c6732804f26ef70242a09fc2f0))

## [1.6.1](https://github.com/Carmentis/carmentis-desk/compare/v1.6.0...v1.6.1) (2026-03-04)


### Bug Fixes

* addCredential for operator was called with two inverted parameters ([219a1ca](https://github.com/Carmentis/carmentis-desk/commit/219a1ca32eb662a77b9805b289e8c6d43ce059a8))

# [1.6.0](https://github.com/Carmentis/carmentis-desk/compare/v1.5.0...v1.6.0) (2026-03-04)


### Features

* add Navbar component with contextual actions and integrate it across detail views ([e60b0d2](https://github.com/Carmentis/carmentis-desk/commit/e60b0d2f720beaa9e97a25160c8184e0611180e2))

# [1.5.0](https://github.com/Carmentis/carmentis-desk/compare/v1.4.0...v1.5.0) (2026-03-03)


### Bug Fixes

* add missing input-class for Password fields in WalletDetail component ([faf8da2](https://github.com/Carmentis/carmentis-desk/commit/faf8da23d15286fae91e52a44434e611c573eaf7))
* update empty state condition and message in Home component ([60fa30b](https://github.com/Carmentis/carmentis-desk/commit/60fa30b3724d00a0742be18f1e4c4ddeb82a7835))
* update wallet route check for "WalletSidebar" component ([a24c51d](https://github.com/Carmentis/carmentis-desk/commit/a24c51db70c39c0a5d5823afa9bbd172387f274f))


### Features

* add "Home" navigation link to WalletSidebar and update wallet route check ([af47953](https://github.com/Carmentis/carmentis-desk/commit/af47953c4a821c65fb89bb8b61de6ce8341d43e5))
* add confirmation dialog for wallet deletion in WalletDetail component ([605ddfa](https://github.com/Carmentis/carmentis-desk/commit/605ddfa947e85a56106066c1fea2a543af4539d2))
* add description and website fields to Application details and enhance UI display ([99ea25d](https://github.com/Carmentis/carmentis-desk/commit/99ea25d9548c91dc46c60d054a04cc89d9ebff8e))
* add search functionality for organizations and operators in Home component ([791d88b](https://github.com/Carmentis/carmentis-desk/commit/791d88b0608f795519173dc938ac177e0c161e0d))
* add warning for missing wallets and create wallet prompt in OperatorDetail component ([9a8e9f6](https://github.com/Carmentis/carmentis-desk/commit/9a8e9f61bbad25333ffb2d1f48b110f0b58afa3c))

# [1.4.0](https://github.com/Carmentis/carmentis-desk/compare/v1.3.0...v1.4.0) (2026-03-02)


### Features

* add "Clear All Operators" and "Add Operator" buttons to top wallet actions ([940f291](https://github.com/Carmentis/carmentis-desk/commit/940f2910046d9c0b94ac3bc996b71ee9a9190f77))
* add passphrase generation using `@scure/bip39` and update form UI ([d7aa459](https://github.com/Carmentis/carmentis-desk/commit/d7aa459b5022658101548028617930f3ee0a2be6))
* integrate Menubar with menu actions and refactor Home layout ([69b13fc](https://github.com/Carmentis/carmentis-desk/commit/69b13fc4c1a64cda1631300c67318e7198e69c4e))

# [1.3.0](https://github.com/Carmentis/carmentis-desk/compare/v1.2.2...v1.3.0) (2026-02-26)


### Bug Fixes

* invalid validator node id field name ([05793ca](https://github.com/Carmentis/carmentis-desk/commit/05793ca3497cee113d48799b7c54fe11acadeda6))


### Features

* moving to sdk 1.20 ([7c6ea0c](https://github.com/Carmentis/carmentis-desk/commit/7c6ea0c35edd879dbc3811174bfe40b5c8f6b130))

## [1.2.2](https://github.com/Carmentis/carmentis-desk/compare/v1.2.1...v1.2.2) (2026-02-19)


### Bug Fixes

* enable mac and linux releases ([ae2d611](https://github.com/Carmentis/carmentis-desk/commit/ae2d6115287fdd1083447af2ab7ebbd3f45698b9))

## [1.2.1](https://github.com/Carmentis/carmentis-desk/compare/v1.2.0...v1.2.1) (2026-02-19)


### Bug Fixes

* attempt to fix the windows invalid production tag ([ff39e48](https://github.com/Carmentis/carmentis-desk/commit/ff39e48ef5bbcb357ccc97961c5cbd6ca6e659b0))

# [1.2.0](https://github.com/Carmentis/carmentis-desk/compare/v1.1.2...v1.2.0) (2026-02-19)


### Bug Fixes

* attempt to fix the ci for Windows ([9c9e874](https://github.com/Carmentis/carmentis-desk/commit/9c9e8748970662c1b55396278a0871b8cf5f306a))


### Features

* add process plugin and implement update functionality ([09a9cde](https://github.com/Carmentis/carmentis-desk/commit/09a9cde6916d816203eb59fb6da029d7fbc0472c))

## [1.1.2](https://github.com/Carmentis/carmentis-desk/compare/v1.1.1...v1.1.2) (2026-02-19)


### Bug Fixes

* comment to explain what we do for the storage init ([995e77b](https://github.com/Carmentis/carmentis-desk/commit/995e77b260db2c291cf661ae8310ab4b3a1adf41))

## [1.1.1](https://github.com/Carmentis/carmentis-desk/compare/v1.1.0...v1.1.1) (2026-02-18)


### Bug Fixes

* update release name in release workflow config ([4efd70f](https://github.com/Carmentis/carmentis-desk/commit/4efd70f9919e6cbd1252678a1e6d4c17c3db76c7))

# [1.1.0](https://github.com/Carmentis/carmentis-desk/compare/v1.0.0...v1.1.0) (2026-02-18)


### Bug Fixes

* unused selected wallet information containing errors ([9cb2070](https://github.com/Carmentis/carmentis-desk/commit/9cb207070eef9c7a2132780043c8d133a9a9b2d5))
* update application mutation to use updated parameter types ([3018eba](https://github.com/Carmentis/carmentis-desk/commit/3018ebaaba749dcc35e8dd654630d7a39e050c08))


### Features

* add clearOperators method to storage module ([abc3247](https://github.com/Carmentis/carmentis-desk/commit/abc324715c46f2333bf1e1e564147e8402f40e39))

# 1.0.0 (2026-02-18)


### Bug Fixes

* adjust padding in WalletSidebar for improved spacing consistency ([2d28f09](https://github.com/Carmentis/carmentis-desk/commit/2d28f0942bda04a9bab5404fb6e6162ae2bd9e06))
* await not allowed in main.ts ([2ce6d0d](https://github.com/Carmentis/carmentis-desk/commit/2ce6d0d4f781d9b0dd6b950d5c09adad4bbcad5c))
* building error due to unused variables ([ae32709](https://github.com/Carmentis/carmentis-desk/commit/ae327097ce3eb75ab25b3b440c56bf5e80d9b38e))
* format transaction dates using `toLocaleString` in WalletDetailTransactionsHistory ([eb3a0f8](https://github.com/Carmentis/carmentis-desk/commit/eb3a0f89df083133e1cd0b8fb15544645e0bb4cf))
* limit GitHub Actions matrix to run one job at a time ([4fbe332](https://github.com/Carmentis/carmentis-desk/commit/4fbe3328525a103fdc6d1311bd342801669cfe18))
* make WalletSidebar fixed with consistent width ([f6b59bf](https://github.com/Carmentis/carmentis-desk/commit/f6b59bffc8c1906e96c5c59476da6850b84e6350))
* missing auth token ([b3cda91](https://github.com/Carmentis/carmentis-desk/commit/b3cda9198a189d9f30b3d2f1c56927bded39026c))
* missing pk in config ([935ef23](https://github.com/Carmentis/carmentis-desk/commit/935ef2372fbec5f0fbd5715358738678f4f0ab65))
* multiple issues ([f90e245](https://github.com/Carmentis/carmentis-desk/commit/f90e245d104cf5055106763e54baa8ce7dd0ac2a))
* no sig ([63e9cf5](https://github.com/Carmentis/carmentis-desk/commit/63e9cf5598ff725eb0ab299b92ba27b9499b72fb))
* perform prerelease in next branch ([8c4fae8](https://github.com/Carmentis/carmentis-desk/commit/8c4fae86d73474ec704d7775c596b6c71d0f662d))
* remove redundant challenge text from Login section in OperatorDetailLogin ([30e342f](https://github.com/Carmentis/carmentis-desk/commit/30e342fc2cf3fc7d50b8d1a8afd36a32660399f4))
* remove unused imports and handle undefined wallet in OrganizationDetailNew ([13e4d2b](https://github.com/Carmentis/carmentis-desk/commit/13e4d2be2cc3830fd9f0f4fcc2c0765b4341c177))
* update ([457780f](https://github.com/Carmentis/carmentis-desk/commit/457780fe1f21e8df26cca2b93bb89264d1705022))
* v0 to tauri action ([5f372af](https://github.com/Carmentis/carmentis-desk/commit/5f372affadeaef406307a861a3536326b8305e5e))


### Features

* add "No account found" card in WalletDetail for undefined wallet accounts ([03dcacc](https://github.com/Carmentis/carmentis-desk/commit/03dcacc5971f00fa0325dc6ad2204467468eadda))
* add `WalletDetail` and `OrganizationDetailNew` components for wallet and organization management ([0c1fa69](https://github.com/Carmentis/carmentis-desk/commit/0c1fa69ccd857ea55dd48aac2eecc4f3b3ad63bd))
* add account breakdown composable and integrate it into WalletDetail ([eb6eb61](https://github.com/Carmentis/carmentis-desk/commit/eb6eb613d0cffe2b299e621e0769c957ffaa1432))
* add account breakdown composable and integrate it into WalletDetail ([439d461](https://github.com/Carmentis/carmentis-desk/commit/439d461bd49c19276919be05a2106f203efd1120))
* add amount icons to transaction history and improve title layout ([6e1e7bd](https://github.com/Carmentis/carmentis-desk/commit/6e1e7bd7879540dd8d095e3d8a173af9847c5105))
* add API key management to operator dashboard ([c32714d](https://github.com/Carmentis/carmentis-desk/commit/c32714d9fe850010448894f1d2212efc239e4e46))
* add application management functionality ([a217a95](https://github.com/Carmentis/carmentis-desk/commit/a217a95a24a0daa14ecd2173ffcf74792d7fd7e4))
* add application management to operator dashboard ([008bc0c](https://github.com/Carmentis/carmentis-desk/commit/008bc0c1a905eb7be968278b09f78553412f44e2))
* add application navigation and active state logic in WalletSidebar ([ce71133](https://github.com/Carmentis/carmentis-desk/commit/ce71133f7f21e2bd99231e85913d302b77fd419a))
* add breadcrumbs and organization names across wallet and organization views ([04a5c0e](https://github.com/Carmentis/carmentis-desk/commit/04a5c0e3b1cd5527020b72d87cb6bf9816b54814))
* add cargo caching to GitHub Actions workflow ([0f30e94](https://github.com/Carmentis/carmentis-desk/commit/0f30e9428adc1a3700d1cb478ff45778be1c2599))
* add confirmation dialog for clearing all wallets ([38153d7](https://github.com/Carmentis/carmentis-desk/commit/38153d7fac98541758d563840db6f4edf955fc7d))
* add delete functionality for users and wallets in operator dashboard ([96fae47](https://github.com/Carmentis/carmentis-desk/commit/96fae4768dc13a5241e49c4dd04f81a01eb80e77))
* add entity icons to headers in detail views ([ee1fe1b](https://github.com/Carmentis/carmentis-desk/commit/ee1fe1bea62c8537a2103dfa7ce39964010667e9))
* add loading state for wallet breakdown and fetch account state by public key ([0c68acc](https://github.com/Carmentis/carmentis-desk/commit/0c68accfa0ff728700a46f1009c5a4cf744ae62b))
* add local details update before on-chain publishing ([ec494c5](https://github.com/Carmentis/carmentis-desk/commit/ec494c5e6be87c0295bb2e9277a18282d02bb2c7))
* add new Carmentis icon for app packaging ([2dd4f71](https://github.com/Carmentis/carmentis-desk/commit/2dd4f7119a3280c3601f534b0c59bdcbd370a335))
* add node claiming functionality in NodeDetail and on-chain store ([c6bac82](https://github.com/Carmentis/carmentis-desk/commit/c6bac82fc98abfc39513d4b2f26587b8458db649))
* add node update functionality and enhance node import process ([2dbb8fa](https://github.com/Carmentis/carmentis-desk/commit/2dbb8fa682d1616fb55f70f8bb1d20c429227a87))
* add NodeDetail component and improve wallet management UX ([58812d4](https://github.com/Carmentis/carmentis-desk/commit/58812d412f6ac729608db5ca983041d22635288b))
* add on-chain publishing functionality for organizations ([e98d43f](https://github.com/Carmentis/carmentis-desk/commit/e98d43f837c384186d1f7268e709dddedccedb21))
* add operator management and authentication functionality ([a662889](https://github.com/Carmentis/carmentis-desk/commit/a6628892ee06af7d9adc071e36fefb0b6ff8b161))
* add organization creation and management features ([70948a0](https://github.com/Carmentis/carmentis-desk/commit/70948a0ee0c172911aae573345a162a676225ef6))
* add organization deletion functionality with confirmation dialog ([9c69925](https://github.com/Carmentis/carmentis-desk/commit/9c699256f5514c7cce0fa12acd201e03172ac1be))
* add organization details editing and enhance UI with Vue Query integration ([15ff7e3](https://github.com/Carmentis/carmentis-desk/commit/15ff7e362995c58e4a77fda60d1da7587ff8dd3f))
* add organization on-chain status check and logging improvements ([df16427](https://github.com/Carmentis/carmentis-desk/commit/df16427a8bf9f5658420633fea6c7950d136cf60))
* add passphrase-based seed creation to CreateOrganization ([6c59f87](https://github.com/Carmentis/carmentis-desk/commit/6c59f873bef000bf974307184f6ea6c8b7b6b3dc))
* add publish confirmation dialog in OrganizationDetailNew.vue ([6da2597](https://github.com/Carmentis/carmentis-desk/commit/6da25976298639d72a4dd2b34e93e73106937fe8))
* add staking and unstaking functionality in NodeDetail and on-chain store ([4a0e3db](https://github.com/Carmentis/carmentis-desk/commit/4a0e3db1f2e82e4c75c57025313eb923da709e56))
* add staking and unstaking functionality to NodeDetail ([1538b90](https://github.com/Carmentis/carmentis-desk/commit/1538b90292ebc0a18a58a1c9d062ddd08f22c4f1))
* add token transfer functionality to WalletDetail ([fbe0d7f](https://github.com/Carmentis/carmentis-desk/commit/fbe0d7fc9e8fc42861b4d2c5c0b3108aed359e8c))
* add transaction history view and fetching logic in WalletDetail ([971ca91](https://github.com/Carmentis/carmentis-desk/commit/971ca91680769cf48791ef4c1c86b5c2b1e4403a))
* add user and wallet creation dialogs to operator dashboard ([ecebf5c](https://github.com/Carmentis/carmentis-desk/commit/ecebf5ca05e155202aafd0ab868be62cd1442ee9))
* add wallet data refresh functionality and improve query handling ([1544e98](https://github.com/Carmentis/carmentis-desk/commit/1544e988d7df67f46c9b04027f0ff447a600ed23))
* add wallet key copy actions and SplitButton in WalletDetail ([1f756ee](https://github.com/Carmentis/carmentis-desk/commit/1f756ee61f9786e2c42e9d411b98243d35e093ce))
* add wallet upload functionality to operator dashboard ([4f17e93](https://github.com/Carmentis/carmentis-desk/commit/4f17e93ce4ace7085bcb986f4e5dc4ec6f47dbc8))
* display connected chain name in NodeDetail ([ca83655](https://github.com/Carmentis/carmentis-desk/commit/ca83655b650c30f129c7f57e1c0e93a60b7452f2))
* enhance NodeDetail with publication and ownership status ([6c91d6a](https://github.com/Carmentis/carmentis-desk/commit/6c91d6afc597e728c4f16ecc4dd5a152b81afa9b))
* enhance operator login and dashboard UI with improved layouts and functionality ([c0a8b78](https://github.com/Carmentis/carmentis-desk/commit/c0a8b78bfc1fad023c614fcc3b25cce77dbb3307))
* enhance WalletDetail and WalletSidebar with organization and chain connection details ([be498eb](https://github.com/Carmentis/carmentis-desk/commit/be498eb10d5f326ec8e624aff3ac61f62e664328))
* enhance WalletDetail with account ID query and refetch functionality ([4c50b4f](https://github.com/Carmentis/carmentis-desk/commit/4c50b4f340995116e2127c7aa02bb6748970c3fb))
* include PrimeIcons font assets in Vite build config ([f8f11f3](https://github.com/Carmentis/carmentis-desk/commit/f8f11f3fa416b17a73c372b41b8deb42867be6b7))
* integrate `useHasAccountOnChainQuery` across components for account presence validation ([1d7aec6](https://github.com/Carmentis/carmentis-desk/commit/1d7aec66dd429ddac3fc9be20d66009a61831914))
* integrate `vite-plugin-static-copy` for font asset handling ([8168415](https://github.com/Carmentis/carmentis-desk/commit/81684151714cd03504ee67de84567ad20e461899))
* integrate Tendermint RPC client in NodeDetail for enhanced node status handling ([5c88bdd](https://github.com/Carmentis/carmentis-desk/commit/5c88bdd3e142cec448d8fef85610ff7e7f046f74))
* introduce nested wallet layout and improve routing structure ([3148545](https://github.com/Carmentis/carmentis-desk/commit/314854538733f87b7a3e2e86913faf86e4613538))
* redesign operator setup UI with improved layout and interaction ([cab7347](https://github.com/Carmentis/carmentis-desk/commit/cab7347ab144490f9e5c377e6769874ee6e70884))
* remove the small header in the operator page to include the back button in the navbar. ([6b0286e](https://github.com/Carmentis/carmentis-desk/commit/6b0286e190b9622dd2d5be5ec2061b9cba631f18))
* replace user and wallet lists with tables in operator dashboard ([832979a](https://github.com/Carmentis/carmentis-desk/commit/832979a14ebcbcbebde8f164781e9f1e812d1eba))
* update Toast component with top-center positioning ([2713eae](https://github.com/Carmentis/carmentis-desk/commit/2713eae2aa2f3f082c4d62fa1d40716840b8515e))
* update updater plugin config and release channels ([4978dbd](https://github.com/Carmentis/carmentis-desk/commit/4978dbd83ff1e7ccf3ab3d18a8e73a7a452fc6a3))
