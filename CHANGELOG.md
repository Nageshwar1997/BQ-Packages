# Changelog

All notable changes to this project will be documented in this file.

This project follows Semantic Versioning.

## `@beautinique/backend-bullmq` [1.0.1]

### Added

- `mail-queue` gained two new job names: `send-contact-acknowledgement` and
  `send-contact-admin-notification`, for the "Contact Us" feature's
  acknowledgement/admin-notification emails - both carry a pre-rendered
  `{ to, subject, data }` payload, exported as `IContact`.

## [1.0.0]

### Added

Initial monorepo setup.