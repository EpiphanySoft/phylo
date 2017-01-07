'use strict';

let $path = require('path');
let gulp = require('gulp');
let excludeGitignore = require('gulp-exclude-gitignore');
let mocha = require('gulp-mocha');
let istanbul = require('gulp-istanbul');
let nsp = require('gulp-nsp');
let plumber = require('gulp-plumber');
let coveralls = require('gulp-coveralls');

gulp.task('nsp', function (cb) {
    nsp({ package: $path.resolve('package.json') }, cb);
});

gulp.task('pre-test', function () {
    return gulp.src('File.js')
        .pipe(excludeGitignore())
        .pipe(istanbul({
            includeUntested: true
        }))
        .pipe(istanbul.hookRequire());
});

gulp.task('test', ['pre-test'], function (cb) {
    let mochaErr;

    gulp.src('test/**/*.js')
        .pipe(plumber())
        .pipe(mocha({ reporter: 'spec' }))
        .on('error', function (err) {
            mochaErr = err;
        })
        .pipe(istanbul.writeReports())
        .on('end', function () {
            cb(mochaErr);
        });
});

gulp.task('watch', function () {
    gulp.watch(['File.js', 'test/**'], ['test']);
});

gulp.task('coveralls', ['test'], function () {
    if (!process.env.CI) {
        return;
    }

    return gulp.src($path.join(__dirname, 'coverage/lcov.info'))
        .pipe(coveralls());
});

gulp.task('prepublish', ['nsp']);
gulp.task('default', ['test', 'coveralls']);
