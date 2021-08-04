# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security

## [1.2.1] - 2021-08-04

### Added

- Detect and resolve eventual conflicts
- Ensure that StoreDataSource exists in the service worker

## [1.2.0] - 2021-07-09

### Added

- Add subscription and web socket in DataSource
- Add StoreDataSource class to store DataSource
- Add subscription endpoint
- Run websocket server on port 8999 (default port)
- Add subscription support in service worker

## [1.1.7] - 2021-04-16

### Changed

- updateObject confirms the update
- Change references from Github to Gitlab

## [1.1.6] - 2021-04-01

### Changed

- Put GraphQL schema in a separate file
- Systemd service is using npx with package from npmjs
- Clean and update the code abstraction over PouchDB
- Use our PouchDB datasource

### Removed

- Remove unused packages

### Fixed

- Fix tests to match the new typing interface
