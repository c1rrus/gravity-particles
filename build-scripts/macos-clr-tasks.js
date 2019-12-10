const fs = require('fs');
const os = require('os');
const gulp = require('gulp');
const download = require('gulp-download-files');
const decompress = require('gulp-decompress');
const shell = require('gulp-shell');

const bldApi = require('../build-api');
const bldPaths = require('./build-paths');

const colorToolsDirname = 'color-tools';
const clrToolName = 'Html2Clr';

/*
  Downloads the "Mac OS X developer color tools" binaries, unless they have already
  been downloaded.

  See: https://github.com/ramonpoca/ColorTools

*/
function downloadMacColorTools() {
  try {
    fs.statSync(bldPaths.tmpBinPath(colorToolsDirname, clrToolName));
    console.log('macOS color tools already downloaded.');
    return Promise.resolve();
  }
  catch (err) {
    if (err.code === 'ENOENT') {
      // File does not yet exist, so download it:
      console.log('Downloading macOS color tools...');
      return download('https://github.com/ramonpoca/ColorTools/releases/download/0.3/ColorTools-0.3.zip')
        .pipe(decompress())
        .pipe((gulp.dest(bldPaths.tmpBinPath(colorToolsDirname))));
    }
    else {
      throw err;
    }
  }
}

/*
  Changes to the tmp build files directory and runs the Html2Clr tool on the .txt
  file generated by StyleDictionary to convert it to .clr

  The noisy output of Html2Clr is suppressed for cleaner build logs.
*/
const runClrTool = shell.task(
  `cd ${bldPaths.tmpMacOsPath()};${bldPaths.tmpBinPath(colorToolsDirname, clrToolName)} ${bldPaths.macOsColorsTmpTxtFilename} &> /dev/null`
);
runClrTool.displayName = 'runClrTool';

/*
  Copies the generated .clr file from the tmp directory to the final build output
  directory.
 */
function copyClrFiles() {
  return gulp.src(bldPaths.tmpMacOsPath('*.clr'))
    .pipe(gulp.dest(bldApi.distPath('macOS')));
}

/*
  Generates the final .clr file when possible.

  This process relies on a tool only available for macOS. So, if
  running on another OS, this task will print a warning message and
  end immediately.
*/
function convertToClr(done) {
  if (os.platform() === 'darwin') {
    // We're running on macOS, so we can
    // do the .clr conversion!
    (gulp.series(
      downloadMacColorTools,
      runClrTool,
      copyClrFiles,
    ))(done);
  }
  else {
    console.warn('Skipping .clr generation, as we can only do that when running on macOS.');
    done();
  }
}

module.exports = {
  convertToClr,
};
