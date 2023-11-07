# Changelog

## [unreleased]

### Changed

- Reworked schema inference.
  - fixed-length integers are no longer inferred, as they are usually represented as varints.
  - it also tries to decode strings and submessages.

## [0.1.0] - 2023-11-06

### Added

- Initial release.
- Protobuf parser in a ES Module format.
- Protobuf parser as a BigQuery UDF, along with small CLI to generate the minimized version.
- Baseline tests written in Go.

[unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/qnighy/bqpb/releases/tag/v0.1.0

## Early history

The idea of this project dates back to 2019, when I wrote the following code snippet for my work:

https://gist.github.com/qnighy/79d5eedbd4cf26a573c2cbd09a4b3956

It was a rather specialized function that only works for a specific protobuf schema, and it also lacked support for a certain construct, like groups.
