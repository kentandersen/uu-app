var path = require('path');
var gulp = require('gulp');
var sourcemaps = require('gulp-sourcemaps');

var rename = require("gulp-rename");
var rimraf = require('rimraf');

var browserify = require('gulp-browserify');
var hbsfy = require('hbsfy');

var source = require('vinyl-source-stream');
var jshint = require('gulp-jshint');
var imagemin = require('gulp-imagemin');

var less = require('gulp-less-sourcemap');

// Paths
var build  = path.join(__dirname, 'build');
var webapp = path.join(__dirname, 'src');
var config = path.join(__dirname, 'config');

// Test
gulp.task('jshint', function() {
  gulp.src([webapp + '/**/*.js'])
    .pipe(jshint())
    .pipe(jshint.reporter('jshint-stylish'))
    .pipe(jshint.reporter('fail'))
});

gulp.task('image', function() {
  return gulp.src([webapp + '/images/**/*'])
    .pipe(imagemin({optimizationLevel: 5}))
    .pipe(gulp.dest(path.join(build, 'images')));
});

gulp.task('less', function() {
  return gulp.src(webapp + '/main.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .pipe(sourcemaps.write())
    .pipe(rename("styles.css"))
    .pipe(gulp.dest(build));
});

gulp.task('html', function() {
  gulp.src(webapp + '/*.html')
  .pipe(gulp.dest(build));
});

gulp.task('js', function() {
  var handlebars = hbsfy.configure({
    extensions: ["hb"]
  });
  return gulp.src(webapp + '/main.js')
    .pipe(browserify({
      transform: [handlebars],
      debug: true
    }))
    .pipe(gulp.dest(build))
});

// Utilities
gulp.task('clean', function(done) {
  rimraf(build, done);
});

gulp.task('dev', function() {
  gulp.watch(webapp + '/**/*.less', ['less']);
  gulp.watch(webapp + '/**/*.js', ['js']);
  gulp.watch(webapp + '/index.html', ['html']);
});

gulp.task('tdd', function (done) {
  karma.start(karmaConfig, done);
});


// Groups
gulp.task('test', ['jshint']);
gulp.task('build', ['js', 'less', 'image', 'html']);
gulp.task('default', ['test', 'build']);
