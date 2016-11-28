const File = require('../../File');

const expect = require('expect.js');
const Path = require('path');
//const co = require('co');

//const Utils = require('../util');

describe('Path manipulation', () => {
    describe('absolute and relative paths', () => {
        const P = 'bar/../foo';

        it('should store a relative path on construction', () => {
            let f = new File(P);
            expect(f.path.indexOf('..')).to.be.above(-1);
        });

        it('return false for abs.isRelative', () => {
            let f = File.cwd();
            expect(f.isRelative()).to.be(false);
        });

        it('return true for abs.isAbsolute', () => {
            let f = File.cwd();
            expect(f.isAbsolute()).to.be(true);
        });

        it('return true for rel.isRelative', () => {
            let f = new File(P);
            expect(f.isRelative()).to.be(true);
        });

        it('return false for rel.isAbsolute', () => {
            let f = new File(P);
            expect(f.isAbsolute()).to.be(false);
        });

        it('absolutify', () => {
            let f = new File(P);

            f = f.absolutify();

            let p = Path.resolve(process.cwd(), P);

            expect(f.path).to.be(p);
        });

        it('absolutePath', () => {
            let f = new File(P);

            let s = f.absolutePath();
            let p = Path.resolve(process.cwd(), P);

            expect(s).to.be(p);
        });
    });

    describe('name property', () => {
        it('should return the name of an unterminated name', () => {
            let f = new File('foo');
            expect(f.name).to.be('foo');
        });

        it('should return the name of an terminated name', () => {
            let f = new File('foo/');
            expect(f.name).to.be('foo');
        });

        it('should return the name of an unterminated path', () => {
            let f = new File('foo/bar');
            expect(f.name).to.be('bar');
        });

        it('should return the name of an terminated path', () => {
            let f = new File('foo/bar/');
            expect(f.name).to.be('bar');
        });
    });

    describe('parent property', () => {
        //TODO
    });

    describe('extent property', () => {
        //TODO
    });

    describe('fspath property', () => {
        //TODO
    });
});
