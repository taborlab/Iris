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

## [0.6.0] - Unreleased
### Added
- Added version number to Iris header.

### Changed
- Changed styling on input styles tabs to make them smaller and more consistent with other buttons.

### Removed
- Removed custom input devices. We decided that it would always be easier for users (or us) to add new devices to the devices.json file than to enter them as custom devices in Iris. This also eliminates many of the bugs caused by custom devices.

### Fixed
- Sine wave amplitude & randomization matrices are now saved & loaded correctly in the Iris save file.
- Deselecting wells now possible in steady-state inputs.
- Fixed an issue where the wrong number of wells were filled in Dynamic mode for devices other than the 24-well plate.
- Fixed an issue where the number of wells used display in Advanced mode Experiemnts would be incorrect for step waveforms.

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