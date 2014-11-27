var path = require('path');
var gulp = require('gulp');
var transform = require('vinyl-transform');
var sourcemaps = require('gulp-sourcemaps');

var rename = require("gulp-rename");
var rimraf = require('rimraf');

var browserify = require('browserify');

var source = require('vinyl-source-stream');
var jshint = require('gulp-jshint');
var imagemin = require('gulp-imagemin');

var less = require('gulp-less');

var isWatch = false;

function swallowError (error) {
  if (isWatch) {
    this.emit('end');
    console.log(error.toString());
  } else {
    this.removeListener('error', swallowError);
    this.emit('error', error);
  }
}

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
    // .pipe(imagemin({optimizationLevel: 5}))
    .pipe(gulp.dest(path.join(build, 'images')));
});

gulp.task('less', function() {
  return gulp.src(webapp + '/main.less')
    .pipe(sourcemaps.init())
    .pipe(less())
    .on('error', swallowError)
    .pipe(rename("styles.css"))
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(build));
});

gulp.task('html', function() {
  gulp.src(webapp + '/*.html')
  .pipe(gulp.dest(build));
});

gulp.task('js', function() {
  return gulp.src(webapp + '/main.js')
    .pipe(transform(function(filename) {
      return browserify(filename, { debug: true })
      .ignore("jquery")
      .ignore("underscore")
      .require([{expose: "backbone", file: path.resolve("./shim/backbone.js")}])
      .bundle();
    }))
    .on('error', swallowError)
    .pipe(gulp.dest(build))
});

// Utilities
gulp.task('clean', function(done) {
  rimraf(build, done);
});

gulp.task('dev', function() {
  isWatch = true;
  gulp.watch(webapp + '/**/*.less', ['less']);
  gulp.watch(webapp + '/**/*.{js,hb}', ['js']);
  gulp.watch(webapp + '/index.html', ['html']);
});


// Groups
gulp.task('test', ['jshint']);
gulp.task('build', ['js', 'less', 'image', 'html']);
gulp.task('default', ['test', 'build']);
