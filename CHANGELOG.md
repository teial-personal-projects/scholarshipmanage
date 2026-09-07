# Changelog

All notable user-facing changes to ScholarshipManage are documented in this
file.

The format is based on [Keep a Changelog], and this project follows
[Semantic Versioning]. Add new entries under `Unreleased`, then move them into
a dated version section when publishing a release.

## [Unreleased]

## [3.0.0] - 2026-09-07

### Added

- Added local CSV export for scholarship applications from the grid view.
- Added CSV fields for scholarship details, status, dates, award amounts,
  renewal information, requirements, and application links.
- CSV exports now include only applications matching the active search,
  status, and due-date filters, across all matching pages.
- The CSV export button is disabled when no applications match the active
  filters.

### Security

- Exported text that could be interpreted as a spreadsheet formula is escaped
  before download.

[Keep a Changelog]: https://keepachangelog.com/en/1.1.0/
[Semantic Versioning]: https://semver.org/spec/v2.0.0.html
