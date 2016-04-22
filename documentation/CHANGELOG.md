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

## [0.6.2]
###Fixed
-  Randomization matrix now functions with deselected wells
-  Deselecting a well updates the simulation even when input parameters are invalid
-  Fixed calculation of total wells in dynamic mode when wells were deselected while in another mode

## [0.6.0] - 2016-01-13
### Added
- Added version number to Iris header.

### Changed
- Changed styling on input styles tabs to make them smaller and more consistent with other buttons.

### Fixed
- Sine wave amplitude & randomization matrices are now saved & loaded correctly in the Iris save file.
- Deselecting wells now possible in steady-state inputs.
- Fixed an issue where the wrong number of wells were filled in Dynamic mode for devices other than the 24-well plate.
- Fixed an issue where the number of wells used display in Advanced mode Experiemnts would be incorrect for step waveforms.

## [0.5.0] - 2016-01-08
### Added
- Preset input styles: steady-state, dynamic, and advanced, for more efficient data input.
- This changelog. Initial version number (0.5.0) selected so that previous versions can be back-dated if desired.

### Changed
- Step waveform input parameters changed from (amplitude, offset, step time) to (low intensity, high intensity, step time) for clarity.

### Removed
- Removed custom input for devices. A much more efficient solution to alternative devices is to add a new entry to the devices JSON object. Users interested in doing this should contact us to add their device to the site, or run Iris locally to customize their devices.
- Removed all other devices not currently being used, except a 96-well device to show as demonstration on Iris.

### Fixed
- CSS rendering issues
