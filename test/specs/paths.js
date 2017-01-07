const File = require('../../File');

const Assert = require('assertly');
const expect = Assert.expect;

const $os = require('os');
const $path = require('path');

//const co = require('co');

//const Utils = require('../util');

describe('Path manipulation', function () {
    const SLASH = File.separator;
    const NOCASE = File.NOCASE;

    describe('absolute and relative paths', function () {
        const P = 'bar/../foo';

        it('should store a relative path on construction', function () {
            let f = new File(P);
            expect(f.path.indexOf('..')).to.be.above(-1);
        });

        it('return false for abs.isRelative', function () {
            let f = File.cwd();
            expect(f.isRelative()).to.be(false);
        });

        it('return true for abs.isAbsolute', function () {
            let f = File.cwd();
            expect(f.isAbsolute()).to.be(true);
        });

        it('return true for rel.isRelative', function () {
            let f = new File(P);
            expect(f.isRelative()).to.be(true);
        });

        it('return false for rel.isAbsolute', function () {
            let f = new File(P);
            expect(f.isAbsolute()).to.be(false);
        });

        it('absolutify', function () {
            let f = new File(P);

            f = f.absolutify();

            let p = $path.resolve(process.cwd(), P);

            expect(f.path).to.be(p);
        });

        it('absolutePath', function () {
            let f = new File(P);

            let s = f.absolutePath();
            let p = $path.resolve(process.cwd(), P);

            expect(s).to.be(p);
        });
    });

    describe('properties', function () {
        describe('name', function () {
            it('should return the name of an unterminated name', function () {
                let f = new File('foo');
                expect(f.name).to.be('foo');
            });

            it('should return the name of an terminated name', function () {
                let f = new File('foo/');
                expect(f.name).to.be('foo');
            });

            it('should return the name of an unterminated path', function () {
                let f = new File('foo/bar');
                expect(f.name).to.be('bar');
            });

            it('should return the name of an terminated path', function () {
                let f = new File('foo/bar/');
                expect(f.name).to.be('bar');
            });
        });

        describe('parent', function () {
            it('should return the name of an unterminated name', function () {
                let f = new File('foo');
                let p = f.parent;
                expect(p.path).to.be(process.cwd());
            });

            it('should return the name of an terminated name', function () {
                let f = new File('foo/');
                let p = f.parent;
                expect(p.path).to.be(process.cwd());
            });

            it('should return the name of an unterminated path', function () {
                let f = new File('foo/bar');
                let p = f.parent;
                expect(p.path).to.be('foo');
            });

            it('should return the name of an terminated path', function () {
                let f = new File('foo/bar/');
                let p = f.parent;
                expect(p.path).to.be('foo');
            });

            it('should return null at root', function () {
                let f = new File('/');
                let p = f.parent;
                expect(p).to.be(null);
            })
        });

        describe('extent', function () {
            describe('empty', function () {
                it('should return the extension of an unterminated name', function () {
                    let f = new File('foo');
                    expect(f.extent).to.be('');
                });

                it('should return the extension of an terminated name', function () {
                    let f = new File('foo/');
                    expect(f.extent).to.be('');
                });

                it('should return the extension of an unterminated path', function () {
                    let f = new File('foo/bar');
                    expect(f.extent).to.be('');
                });

                it('should return the extension of an terminated path', function () {
                    let f = new File('foo/bar/');
                    expect(f.extent).to.be('');
                });
            });

            describe('non-empty', function () {
                it('should return the extension of an unterminated name', function () {
                    let f = new File('foo.js');
                    expect(f.extent).to.be('js');
                });

                it('should return the extension of an terminated name', function () {
                    let f = new File('foo.b/');
                    expect(f.extent).to.be('b');
                });

                it('should return the extension of an unterminated path', function () {
                    let f = new File('foo/bar.json');
                    expect(f.extent).to.be('json');
                });

                it('should return the extension of an terminated path', function () {
                    let f = new File('foo/bar.js/');
                    expect(f.extent).to.be('js');
                });
            });

            describe('dot-file', function () {
                it('should return the extension of an unterminated name', function () {
                    let f = new File('.js');
                    expect(f.extent).to.be('js');
                });

                it('should return the extension of an terminated name', function () {
                    let f = new File('.b/');
                    expect(f.extent).to.be('b');
                });

                it('should return the extension of an unterminated path', function () {
                    let f = new File('foo/.json');
                    expect(f.extent).to.be('json');
                });

                it('should return the extension of an terminated path', function () {
                    let f = new File('foo/.js/');
                    expect(f.extent).to.be('js');
                });
            });
        });

        describe('fspath', function () {
            beforeEach(function () {
                File.COMPANY = 'Acme';
            });
            afterEach(function () {
                delete File.COMPANY;
            });

            it('should resolve ~', function () {
                let f = new File('~');
                let p = f.fspath;
                expect(p).to.be($os.homedir());
            });

            it('should resolve ~/foo', function () {
                let f = new File('~/foo');
                let p = f.fspath;
                expect(p).to.be($path.join($os.homedir(), 'foo'));
            });

            it('should resolve ~~', function () {
                let f = new File('~~');
                let p = f.fspath;
                expect(p.endsWith(SLASH + 'Acme')).to.be(true);
                expect(p.startsWith($os.homedir())).to.be(true);
            });

            it('should resolve ~/foo', function () {
                let f = new File('~~/foo');
                let p = f.fspath;
                expect(p.startsWith($os.homedir())).to.be(true);
                expect(p.endsWith(SLASH + 'Acme' + SLASH + 'foo')).to.be(true);
            });
        });
    });

    describe('compare', function () {
        it('should handle no trailing /', function () {
            let f = new File('foo/bar');
            let c = f.compare('foo/bar');
            expect(c).to.be(0);
        });

        it('should ignore trailing / in other', function () {
            let f = new File('foo/bar');
            let c = f.compare('foo/bar/');
            expect(c).to.be(0);
        });

        it('should ignore trailing / in self', function () {
            let f = new File('foo/bar/');
            let c = f.compare('foo/bar');
            expect(c).to.be(0);
        });

        it('should ignore trailing / in both', function () {
            let f = new File('foo/bar/');
            let c = f.compare('foo/bar/');
            expect(c).to.be(0);
        });
    });

    describe('equals', function () {
        it('should handle no trailing /', function () {
            let f = new File('foo/bar');
            let c = f.equals('foo/bar');
            expect(c).to.be(true);
        });

        it('should ignore trailing / in other', function () {
            let f = new File('foo/bar');
            let c = f.equals('foo/bar/');
            expect(c).to.be(true);
        });

        it('should ignore trailing / in self', function () {
            let f = new File('foo/bar/');
            let c = f.equals('foo/bar');
            expect(c).to.be(true);
        });

        it('should ignore trailing / in both', function () {
            let f = new File('foo/bar/');
            let c = f.equals('foo/bar/');
            expect(c).to.be(true);
        });
    });

    describe('prefixes', function () {
        it('should handle non-prefix', function () {
            let f = new File('foo/barf');
            let c = f.prefixes('foo/bar');
            expect(c).to.be(false);
        });

        it('should handle no trailing /', function () {
            let f = new File('foo/bar');
            let c = f.prefixes('foo/bar/baz');
            expect(c).to.be(true);
        });

        it('should ignore trailing /', function () {
            let f = new File('foo/bar/');
            let c = f.prefixes('foo/bar');
            expect(c).to.be(true);
        });

        it('should ignore trailing / in both', function () {
            let f = new File('foo/bar/');
            let c = f.prefixes('foo/bar/');
            expect(c).to.be(true);
        });
    });

    describe('terminate', function () {
        it('should add a missing /', function () {
            let f = new File('foo/bar');
            let p = f.terminatedPath();
            expect(p).to.be('foo/bar' + SLASH);
        });

        it('should not add an extra /', function () {
            let f = new File('foo/bar/');
            let p = f.terminatedPath();
            expect(p).to.be('foo/bar/');
        });
    });

    describe('unterminate', function () {
        it('should remove one trailing /', function () {
            let f = new File('foo/bar/');
            let p = f.unterminatedPath();
            expect(p).to.be('foo/bar');
        });

        it('should remove all trailing /s', function () {
            let f = new File('foo/bar///');
            let p = f.unterminatedPath();
            expect(p).to.be('foo/bar');
        });

        it('should not remove text if no trailing /', function () {
            let f = new File('foo/bar');
            let p = f.unterminatedPath();
            expect(p).to.be('foo/bar');
        });
    });

    describe('NOCASE = false', function () {
        beforeEach(function () {
            File.NOCASE = false;
        });
        afterEach(function () {
            File.NOCASE = NOCASE;
        });

        describe('compare', function () {
            it('should respect case differences', function () {
                let f = new File('foo/bar');
                let f2 = new File('FOO/BAR');
                let c = f.compare(f2);
                expect(c).to.be.above(0);
            });
        });
    }); // NOCASE = false

    describe('NOCASE = true', function () {
        beforeEach(function () {
            File.NOCASE = true;
        });
        afterEach(function () {
            File.NOCASE = NOCASE;
        });

        describe('compare', function () {
            it('should ignore case differences', function () {
                let f = new File('foo/bar');
                let f2 = new File('FOO/BAR');
                let c = f.compare(f2);
                expect(c).to.be(0);
            });
        });
    }); // NOCASE = true
});
