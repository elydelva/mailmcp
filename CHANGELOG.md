# Changelog

## [0.4.0](https://github.com/elydelva/mailmcp/compare/mailmcp-monorepo-v0.3.0...mailmcp-monorepo-v0.4.0) (2026-03-27)


### Features

* **ci:** add automated npm publish on release ([aafbe95](https://github.com/elydelva/mailmcp/commit/aafbe95a2be8777a11f098097d37aae9e02a9e53))

## [0.3.0](https://github.com/elydelva/mailmcp/compare/mailmcp-monorepo-v0.2.3...mailmcp-monorepo-v0.3.0) (2026-03-25)


### Features

* **providers:** add imap/smtp connection validator and unit tests ([f7ea35e](https://github.com/elydelva/mailmcp/commit/f7ea35ea5c4a9c784b7ef27140e9a769cae16601))
* **providers:** add known-providers static database ([ca31532](https://github.com/elydelva/mailmcp/commit/ca31532cb02a96017ce5b1d9a9db0efa6b059c0f))
* **providers:** implement email-to-provider detection pipeline ([bf8dd2b](https://github.com/elydelva/mailmcp/commit/bf8dd2bbf67eb042ee46b7c3fd74278e2cf03866))
* **storage:** ADR-001 — Storage layer: interface + file backend ([ffe8cc0](https://github.com/elydelva/mailmcp/commit/ffe8cc0cdc909ed4f4bc39ddb36db270c297d3f7))


### Bug Fixes

* **ci:** add missing dockerfile path in release-please docker job ([7ff6620](https://github.com/elydelva/mailmcp/commit/7ff66205379704a4f2038db824702726a11796d5))
* **core:** wire smtp into public api and clean knip ignore ([56b19c5](https://github.com/elydelva/mailmcp/commit/56b19c56993f82893ee58a6a953028e40e2c1e36))
* **docker:** copy all workspace package manifests before bun install ([b391fe2](https://github.com/elydelva/mailmcp/commit/b391fe2cfadf207b25bb4e02b3078c0b7d24cf4a))
* **docker:** copy imap, smtp, tools sources for bun build ([db0fa5c](https://github.com/elydelva/mailmcp/commit/db0fa5c8207e9e632ce2ff2358e0d8acfe5ffc54))


### Documentation

* add README ([fcf1c20](https://github.com/elydelva/mailmcp/commit/fcf1c20ed288d2a289fbcf68f306c141039ea52b))
* **adr:** add adr workflow rules and canonical template ([f7a2598](https://github.com/elydelva/mailmcp/commit/f7a2598dd65be0ebf1c21ec61f77f79008e2dd8f))
* **adr:** add adr-010 monorepo architecture and adr-011 cli workspace ([bb4b8dd](https://github.com/elydelva/mailmcp/commit/bb4b8dd844561b8892ca2ef1f317bf4b80a92093))
* **adr:** add adr-012 for node.js-compatible codebase with bun as runtime only ([62d658c](https://github.com/elydelva/mailmcp/commit/62d658c25fed0483b1ac17e1deb1d2ce847814eb))
* **adr:** add depends_on/required_by fields and dependency rules ([0651412](https://github.com/elydelva/mailmcp/commit/06514129aab4c99e123ce70dc20e3be2478e418f))
* **adr:** add depends_on/required_by to adrs 001-006 ([40d9c66](https://github.com/elydelva/mailmcp/commit/40d9c66978e2fb438bcd276242c7e16dbfdb8a72))
* **adr:** add pr/issue frontmatter fields to all adrs ([bf7fbbf](https://github.com/elydelva/mailmcp/commit/bf7fbbf99d71be975ab74ae77afac869940016b8))
* **adr:** mark adr-002 as completed ([f8626d8](https://github.com/elydelva/mailmcp/commit/f8626d891ad93cdff5c4050b5e4b84ec62f85371))
* **adr:** mark adr-003 and adr-011 as completed ([852662d](https://github.com/elydelva/mailmcp/commit/852662d12e848a78f911d4af51d56cfa9d563a38))
* **adr:** mark adr-004 as completed ([5cd18c7](https://github.com/elydelva/mailmcp/commit/5cd18c7e3d6428863e1007e06f4763f1f9a38979))
* **adr:** mark adr-004 as in-progress ([60e3686](https://github.com/elydelva/mailmcp/commit/60e3686e15270c07f7729248498c9e9d427b95ac))
* **adr:** mark adr-005 and adr-006 as completed ([320a545](https://github.com/elydelva/mailmcp/commit/320a545b4764b02bd5325bccf8e4f0424fb1dbdd))
* **adr:** mark adr-007 as completed ([6a1618c](https://github.com/elydelva/mailmcp/commit/6a1618c4d396839236b2892218c916814d676377))
* **adr:** mark adr-008 as completed ([e2886b8](https://github.com/elydelva/mailmcp/commit/e2886b89c67c102a9808932b569b61ea24460b5c))
* **adr:** mark adr-010 as completed (monorepo shipped in pr [#16](https://github.com/elydelva/mailmcp/issues/16)) ([6e11d22](https://github.com/elydelva/mailmcp/commit/6e11d226d7850d89d7c9d3ba23a8f39aa6a0be10))
* **adr:** rewrite adrs 007-009 for monorepo architecture ([92974f1](https://github.com/elydelva/mailmcp/commit/92974f1a70115c57d0f0c5dfa2dda3fff8711927))
* **adr:** update readme with dependency graph and implementation order ([905b16e](https://github.com/elydelva/mailmcp/commit/905b16e8368c7f0fe9fa858adb6e75ed2f85720d))
* **claude:** refactor claude.md into a lightweight hub ([2728d78](https://github.com/elydelva/mailmcp/commit/2728d789a1241a32e55508a859277a6957bb8ce7))
* **github:** add github sync principle and issue/pr templates ([e990017](https://github.com/elydelva/mailmcp/commit/e990017b00e30ad4c2d1c39f1955d66508396c06))
* **github:** add pr naming convention [type/name] ([2d0233d](https://github.com/elydelva/mailmcp/commit/2d0233db8e544ce4d96fa7f70f86b009807a39fd))
* **instructions:** extract bun and versioning guides from claude.md ([808bb28](https://github.com/elydelva/mailmcp/commit/808bb285beaef8398a07a993693049d244f83087))
* rewrite ai instructions and templates in english, make project-agnostic ([#21](https://github.com/elydelva/mailmcp/issues/21)) ([78ff853](https://github.com/elydelva/mailmcp/commit/78ff853055272114390d677137cb1b2192c25f39))

## [0.2.3](https://github.com/elydelva/mailmcp/compare/mailmcp-monorepo-v0.2.2...mailmcp-monorepo-v0.2.3) (2026-03-25)


### Bug Fixes

* **ci:** add missing dockerfile path in release-please docker job ([7ff6620](https://github.com/elydelva/mailmcp/commit/7ff66205379704a4f2038db824702726a11796d5))

## [0.2.2](https://github.com/elydelva/mailmcp/compare/mailmcp-monorepo-v0.2.1...mailmcp-monorepo-v0.2.2) (2026-03-25)


### Bug Fixes

* **docker:** copy all workspace package manifests before bun install ([b391fe2](https://github.com/elydelva/mailmcp/commit/b391fe2cfadf207b25bb4e02b3078c0b7d24cf4a))
* **docker:** copy imap, smtp, tools sources for bun build ([db0fa5c](https://github.com/elydelva/mailmcp/commit/db0fa5c8207e9e632ce2ff2358e0d8acfe5ffc54))

## [0.2.1](https://github.com/elydelva/mailmcp/compare/mailmcp-monorepo-v0.2.0...mailmcp-monorepo-v0.2.1) (2026-03-25)


### Documentation

* **adr:** add adr-012 for node.js-compatible codebase with bun as runtime only ([62d658c](https://github.com/elydelva/mailmcp/commit/62d658c25fed0483b1ac17e1deb1d2ce847814eb))

## [0.2.0](https://github.com/elydelva/mailmcp/compare/mailmcp-monorepo-v0.1.0...mailmcp-monorepo-v0.2.0) (2026-03-25)


### Features

* **providers:** add imap/smtp connection validator and unit tests ([f7ea35e](https://github.com/elydelva/mailmcp/commit/f7ea35ea5c4a9c784b7ef27140e9a769cae16601))
* **providers:** add known-providers static database ([ca31532](https://github.com/elydelva/mailmcp/commit/ca31532cb02a96017ce5b1d9a9db0efa6b059c0f))
* **providers:** implement email-to-provider detection pipeline ([bf8dd2b](https://github.com/elydelva/mailmcp/commit/bf8dd2bbf67eb042ee46b7c3fd74278e2cf03866))
* **storage:** ADR-001 — Storage layer: interface + file backend ([ffe8cc0](https://github.com/elydelva/mailmcp/commit/ffe8cc0cdc909ed4f4bc39ddb36db270c297d3f7))


### Bug Fixes

* **core:** wire smtp into public api and clean knip ignore ([56b19c5](https://github.com/elydelva/mailmcp/commit/56b19c56993f82893ee58a6a953028e40e2c1e36))


### Documentation

* add README ([fcf1c20](https://github.com/elydelva/mailmcp/commit/fcf1c20ed288d2a289fbcf68f306c141039ea52b))
* **adr:** add adr workflow rules and canonical template ([f7a2598](https://github.com/elydelva/mailmcp/commit/f7a2598dd65be0ebf1c21ec61f77f79008e2dd8f))
* **adr:** add adr-010 monorepo architecture and adr-011 cli workspace ([bb4b8dd](https://github.com/elydelva/mailmcp/commit/bb4b8dd844561b8892ca2ef1f317bf4b80a92093))
* **adr:** add depends_on/required_by fields and dependency rules ([0651412](https://github.com/elydelva/mailmcp/commit/06514129aab4c99e123ce70dc20e3be2478e418f))
* **adr:** add depends_on/required_by to adrs 001-006 ([40d9c66](https://github.com/elydelva/mailmcp/commit/40d9c66978e2fb438bcd276242c7e16dbfdb8a72))
* **adr:** add pr/issue frontmatter fields to all adrs ([bf7fbbf](https://github.com/elydelva/mailmcp/commit/bf7fbbf99d71be975ab74ae77afac869940016b8))
* **adr:** mark adr-002 as completed ([f8626d8](https://github.com/elydelva/mailmcp/commit/f8626d891ad93cdff5c4050b5e4b84ec62f85371))
* **adr:** mark adr-003 and adr-011 as completed ([852662d](https://github.com/elydelva/mailmcp/commit/852662d12e848a78f911d4af51d56cfa9d563a38))
* **adr:** mark adr-004 as completed ([5cd18c7](https://github.com/elydelva/mailmcp/commit/5cd18c7e3d6428863e1007e06f4763f1f9a38979))
* **adr:** mark adr-004 as in-progress ([60e3686](https://github.com/elydelva/mailmcp/commit/60e3686e15270c07f7729248498c9e9d427b95ac))
* **adr:** mark adr-005 and adr-006 as completed ([320a545](https://github.com/elydelva/mailmcp/commit/320a545b4764b02bd5325bccf8e4f0424fb1dbdd))
* **adr:** mark adr-007 as completed ([6a1618c](https://github.com/elydelva/mailmcp/commit/6a1618c4d396839236b2892218c916814d676377))
* **adr:** mark adr-008 as completed ([e2886b8](https://github.com/elydelva/mailmcp/commit/e2886b89c67c102a9808932b569b61ea24460b5c))
* **adr:** mark adr-010 as completed (monorepo shipped in pr [#16](https://github.com/elydelva/mailmcp/issues/16)) ([6e11d22](https://github.com/elydelva/mailmcp/commit/6e11d226d7850d89d7c9d3ba23a8f39aa6a0be10))
* **adr:** rewrite adrs 007-009 for monorepo architecture ([92974f1](https://github.com/elydelva/mailmcp/commit/92974f1a70115c57d0f0c5dfa2dda3fff8711927))
* **adr:** update readme with dependency graph and implementation order ([905b16e](https://github.com/elydelva/mailmcp/commit/905b16e8368c7f0fe9fa858adb6e75ed2f85720d))
* **claude:** refactor claude.md into a lightweight hub ([2728d78](https://github.com/elydelva/mailmcp/commit/2728d789a1241a32e55508a859277a6957bb8ce7))
* **github:** add github sync principle and issue/pr templates ([e990017](https://github.com/elydelva/mailmcp/commit/e990017b00e30ad4c2d1c39f1955d66508396c06))
* **github:** add pr naming convention [type/name] ([2d0233d](https://github.com/elydelva/mailmcp/commit/2d0233db8e544ce4d96fa7f70f86b009807a39fd))
* **instructions:** extract bun and versioning guides from claude.md ([808bb28](https://github.com/elydelva/mailmcp/commit/808bb285beaef8398a07a993693049d244f83087))
* rewrite ai instructions and templates in english, make project-agnostic ([#21](https://github.com/elydelva/mailmcp/issues/21)) ([78ff853](https://github.com/elydelva/mailmcp/commit/78ff853055272114390d677137cb1b2192c25f39))
