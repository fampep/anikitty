/**
 * Windows target for react-native-windows.
 * The Visual Studio solution is not generated in this repo yet.
 * See windows/README.md and `npm run windows`.
 */
module.exports = {
  project: {
    windows: {
      sourceDir: "windows",
      solutionFile: "Anikitty.sln",
      project: {
        projectFile: "Anikitty/Anikitty.vcxproj",
      },
    },
  },
};
