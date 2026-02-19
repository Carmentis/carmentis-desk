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
