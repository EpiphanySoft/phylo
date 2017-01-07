'use strict';

/* global require */

const Assert = require('assertly');

Assert.setup();
Assert.register({
    absolute (file) {
        // expect(f).to.be.absolute();
        return file && file.isAbsolute();
    },

    path (file, expected) {
        // expect(f).to.have.path('foo');
        return file.path === expected;
    },

    relative (file) {
        // expect(f).to.be.relative();
        return file && file.isRelative();
    }
});
