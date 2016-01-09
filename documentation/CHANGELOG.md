# Iris Change Log
A log of recent improvements, changes, and known issues for Iris. Note that new issues may always be submitted to the devs [via email](mailto:iris-devs@rice.edu) or on the [GitHub Repo](https://github.com/rice-bioe/Iris). All version numbers loosely follow [Semantic Versioning](http://semver.org/).

<!---
NOTE:
This document follows semi-standard conventions for a changelog laid out here: http://keepachangelog.com/
Namely:
- Releases are listed in reverse-chronological order
- Dates are formatted: YYYY-MM-DD
- Semantic versioning is loosely followed, in the sense of [MAJOR RELEASE].[MINOR RELEASE].[PATCH]
- Updates group changes into the following groups:
    - Added
    - Changed
    - Removed
    - Fixed
    - Known Issues

Versions are only officially incremented upon publication on the gh-pages GitHub branch.
-->

## [0.5.0] - Unreleased
### Added
- Preset input styles: steady-state, dynamic, and advanced, for more efficient data input.
- This changelog. Initial version number (0.5.0) selected so that previous versions can be back-dated if desired.

### Changed
- Step waveform input parameters changed from (amplitude, offset, step time) to (low intensity, high intensity, step time) for clarity.

### Fixed
- CSS rendering issues

### Known Issues
- Input validation (#273) and well deselection (#275) are broken on custom input devices. In fact, many things about custom devices may be broken.